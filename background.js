var Service = (function() {
    var self = {}, onResponseById = {};

    var activePorts = [],
        frontEndPorts = {},
        contentPorts = {},
        tabActivated = {},
        tabMessages = {},
        frameIncs = {},
        tabURLs = {},
        tabHistory = [],
        tabHistoryIndex = 0,
        historyTabAction = false,
        optionsURL = chrome.extension.getURL('/pages/options.html'),
        frontEndURL = chrome.extension.getURL('/pages/frontend.html');

    var settings = {
        focusOnSaved: true,
        omnibarMaxResults: 20,
        tabsThreshold: 9,
        hintsThreshold: 10000,
        repeatThreshold: 99,
        tabsMRUOrder: true,
        smoothScroll: true,
        blacklist: {},
        marks: {},
        userData: {},
        findHistory: [],
        cmdHistory: [],
        version: chrome.runtime.getManifest().version,
        snippets: "",
        sessions: {},
        newTabPosition: 'right',
        afterYank: 1,
        autoproxy_hosts: {},
        proxyMode: 'clear',
        proxy: "DIRECT",
        interceptedErrors: {},
        storage: 'local'
    };
    var newTabUrl = "chrome://newtab/";

    function request(method, url) {
        return new Promise(function(acc, rej) {
            var xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.onload = function() {
                acc(xhr.responseText);
            };
            xhr.onerror = rej.bind(null, xhr);
            xhr.send();
        });
    }

    function extendSettings(ss) {
        for (var k in ss) {
            settings[k] = ss[k];
        }
    }

    var bookmarkFolders = [];
    function getFolders(tree, root) {
        var cd = root;
        if (tree.title !== "" && !tree.hasOwnProperty('url')) {
            cd += "/" + tree.title;
            bookmarkFolders.push({id: tree.id, title: cd + "/"});
        }
        if (tree.hasOwnProperty('children')) {
            for (var i = 0; i < tree.children.length; ++i) {
                getFolders(tree.children[i], cd);
            }
        }
    }

    function createBookmark(page, onCreated) {
        if (page.path.length) {
            chrome.bookmarks.create({
                'parentId': page.folder,
                'title': page.path.shift()
            }, function(newFolder) {
                page.folder = newFolder.id;
                createBookmark(page, onCreated);
            });
        } else {
            chrome.bookmarks.create({
                'parentId': page.folder,
                'title': page.title,
                'url': page.url
            }, function(ret) {
                onCreated(ret);
            });
        }
    }

    var tabErrors = {};
    function handleMessage(_message, _sender, _sendResponse, _port) {
        if (_message && _message.target !== 'content_runtime') {
            if (self.hasOwnProperty(_message.action)) {
                if (_message.repeats > settings.repeatThreshold) {
                    _message.repeats = settings.repeatThreshold;
                }
                self[_message.action](_message, _sender, _sendResponse);
            } else if (_message.toFrontend) {
                try {
                    frontEndPorts[_sender.tab.id].postMessage(_message);
                    if (_message.action === 'openFinder') {
                        contentPorts[_sender.tab.id] = _port;
                    }
                    if (_message.ack) {
                        onResponseById[_message.id] = _sendResponse;
                    }
                } catch (e) {
                    chrome.tabs.executeScript(_sender.tab.id, {
                        code: "createFrontEnd()"
                    });
                }
            } else if (_message.toContent) {
                contentPorts[_sender.tab.id].postMessage(_message);
                if (_message.ack) {
                    onResponseById[_message.id] = _sendResponse;
                }
            } else if (onResponseById.hasOwnProperty(_message.id)) {
                var f = onResponseById[_message.id];
                delete onResponseById[_message.id];
                f(_message);
            } else {
                var type = _port ? "[unexpected port message] " : "[unexpected runtime message] ";
                console.log(type + JSON.stringify(_message))
            }
        }
    }

    function triggerEvent(obj, evt) {
        var event = document.createEvent("HTMLEvents");
        event.initEvent(evt, true, true);
        event.eventName = evt;
        obj.dispatchEvent(event);
    }

    var settingsReady = false;

    document.addEventListener("settingsReady", function(e) {
        settingsReady = true;
        activePorts.forEach(function(port) {
            port.postMessage({
                action: 'initSettings',
                settings: settings,
                extension_id: chrome.i18n.getMessage("@@extension_id")
            });
        });
    });

    chrome.storage.local.get(null, function(data) {
        if (!data.version || parseFloat(data.version) < 0.11) {
            if (JSON.stringify(data) !== '{}') {
                chrome.storage.local.clear();
                chrome.storage.sync.clear();
            }
            triggerEvent(document, "settingsReady");
        } else {
            extendSettings(data);
            if (data.storage === 'sync') {
                chrome.storage.sync.get(null, function(data) {
                    if (chrome.runtime.lastError) {
                        console.log(chrome.runtime.lastError);
                    } else {
                        extendSettings(data);
                        settings.storage = "sync";
                    }
                    triggerEvent(document, "settingsReady");
                });
            } else {
                triggerEvent(document, "settingsReady");
            }
            if (settings.proxyMode === 'clear') {
                chrome.proxy.settings.clear({scope: 'regular'});
            } else {
                chrome.proxy.settings.get( {}, function(proxyInfo) {
                    if (proxyInfo.levelOfControl === "controlled_by_this_extension" && proxyInfo.value.hasOwnProperty('pacScript')) {
                        // get settings.autoproxy_hosts/settings.proxy/settings.proxyMode from pacScript
                        eval(proxyInfo.value.pacScript.data.substr(19));
                    }
                });
            }
            chrome.webRequest.onErrorOccurred.addListener(function(details) {
                var tabId = details.tabId;
                if (tabId !== -1 && (settings.interceptedErrors.hasOwnProperty("*") || details.error in settings.interceptedErrors)) {
                    if (!tabErrors.hasOwnProperty(tabId)) {
                        tabErrors[tabId] = [];
                    }
                    if (details.type === "main_frame") {
                        tabErrors[tabId] = [];
                        if (details.error !== "net::ERR_ABORTED") {
                            chrome.tabs.update(tabId, {
                                url: chrome.extension.getURL("pages/error.html")
                            });
                        }
                    }
                    tabErrors[tabId].push(details);
                }
            }, {
                urls: ["<all_urls>"]
            });
        }
    });

    chrome.extension.onConnect.addListener(function(port) {
        var sender = port.sender;
        if (sender.url === frontEndURL) {
            frontEndPorts[sender.tab.id] = port;
        }
        activePorts.push(port);
        if (settingsReady) {
            port.postMessage({
                action: 'initSettings',
                settings: settings,
                extension_id: chrome.i18n.getMessage("@@extension_id")
            });
        }
        port.onMessage.addListener(function(message) {
            return handleMessage(message, port.sender, port.postMessage.bind(port), port);
        });
        port.onDisconnect.addListener(function() {
            for (var i = 0; i < activePorts.length; i++) {
                if (activePorts[i] === port) {
                    activePorts.splice(i, 1);
                    break;
                }
            }
        });
    });

    function removeTab(tabId) {
        delete contentPorts[tabId];
        delete frontEndPorts[tabId];
        delete tabErrors[tabId];
        unRegisterFrame(tabId);
        tabHistory = tabHistory.filter(function(e) {
            return e !== tabId;
        });
    }
    chrome.tabs.onRemoved.addListener(removeTab);
    function _setScrollPos_bg(tabId) {
        if (tabMessages.hasOwnProperty(tabId)) {
            var message = tabMessages[tabId];
            chrome.tabs.executeScript(tabId, {
                code: "_setScrollPos(" + message.scrollLeft + ", " + message.scrollTop + ")"
            });
            delete tabMessages[tabId];
        }
    }
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if (changeInfo.status === "loading") {
            unRegisterFrame(tabId);
        }
        _setScrollPos_bg(tabId);
    });
    chrome.tabs.onCreated.addListener(function(tabId, changeInfo, tab) {
        _setScrollPos_bg(tabId);
    });
    chrome.tabs.onActivated.addListener(function(activeInfo) {
        if (frontEndPorts.hasOwnProperty(activeInfo.tabId) && !historyTabAction && activeInfo.tabId != tabHistory[tabHistory.length - 1]) {
            if (tabHistory.length > 10) {
                tabHistory.shift();
            }
            if (tabHistoryIndex != tabHistory.length - 1) {
                tabHistory.splice(tabHistoryIndex + 1, tabHistory.length - 1);
            }
            tabHistory.push(activeInfo.tabId);
            tabHistoryIndex = tabHistory.length - 1;
        }
        tabActivated[activeInfo.tabId] = new Date().getTime();
        historyTabAction = false;
    });
    chrome.commands.onCommand.addListener(function(command) {
        switch (command) {
            case 'restartext':
                chrome.runtime.reload();
                break;
            default:
                break;
        }
    });
    chrome.runtime.onMessage.addListener(handleMessage);
    function _response(message, sendResponse, result) {
        result.action = message.action;
        result.id = message.id;
        sendResponse(result);
    }
    self.getTabErrors = function(message, sender, sendResponse) {
        _response(message, sendResponse, {
            tabError: tabErrors[sender.tab.id]
        });
    };
    self.clearTabErrors = function(message, sender, sendResponse) {
        tabErrors[sender.tab.id] = [];
    };
    self.isTabActive = function(message, sender, sendResponse) {
        chrome.tabs.query({
            active: true
        }, function(resp) {
            var activeTabs = resp.map(function(t) {
                return t.id;
            });
            _response(message, sendResponse, {
                active: (activeTabs.indexOf(sender.tab.id) !== -1)
            });
        });
    };

    function unRegisterFrame(tabId) {
        if (frameIncs.hasOwnProperty(tabId)) {
            delete frameIncs[tabId];
        }
    }

    function _updateSettings(diffSettings, noack, afterSet) {
        var toSet = diffSettings;
        extendSettings(diffSettings);
        chrome.storage.local.set(toSet, function() {
            if (afterSet) {
                afterSet();
            }
        });
        if (settings.storage === 'sync') {
            chrome.storage.sync.set(toSet, function() {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError);
                }
            });
        }
        if (!noack) {
            activePorts.forEach(function(port) {
                port.postMessage({
                    action: 'settingsUpdated',
                    settings: settings
                });
            });
        }
    }

    function _loadSettingsFromUrl(url) {
        var s = request('get', url);
        s.then(function(resp) {
            _updateSettings({localPath: url, snippets: resp}, false);
        });
    };

    self.resetSettings = function(message, sender, sendResponse) {
        if (message.useDefault) {
            _updateSettings({localPath: "", snippets: "", theme: ""}, false, _response.bind(_response, message, sendResponse, {
                settings: settings
            }));
        } else if (settings.localPath) {
            _loadSettingsFromUrl(settings.localPath);
        } else {
            _updateSettings({snippets: ""}, false);
        }
    };
    self.loadSettingsFromUrl = function(message, sender, sendResponse) {
        _loadSettingsFromUrl(message.url);
    };
    function _filterByTitleOrUrl(tabs, query) {
        if (query && query.length) {
            tabs = tabs.filter(function(b) {
                return b.title.indexOf(query) !== -1 || (b.url && b.url.indexOf(query) !== -1);
            });
        }
        return tabs;
    }
    self.getRecentlyClosed = function(message, sender, sendResponse) {
        chrome.sessions.getRecentlyClosed({}, function(sessions) {
            var tabs = [];
            for (var i = 0; i < sessions.length; i ++) {
                var s = sessions[i];
                if (s.hasOwnProperty('window')) {
                    tabs = tabs.concat(s.window.tabs);
                } else if (s.hasOwnProperty('tab')) {
                    tabs.push(s.tab);
                }
            }
            tabs = _filterByTitleOrUrl(tabs, message.query);
            _response(message, sendResponse, {
                urls: tabs
            });
        })
    };
    self.getTopSites = function(message, sender, sendResponse) {
        chrome.topSites.get(function(urls) {
            urls = _filterByTitleOrUrl(urls, message.query);
            _response(message, sendResponse, {
                urls: urls
            });
        })
    };
    self.getAllURLs = function(message, sender, sendResponse) {
        chrome.bookmarks.getRecent(2147483647, function(tree) {
            var urls = tree;
            chrome.history.search({
                startTime: 0,
                maxResults: 2147483647,
                text: ""
            }, function(tree) {
                urls = urls.concat(tree);
                _response(message, sendResponse, {
                    urls: urls
                });
            });
        });
    };
    self.getTabs = function(message, sender, sendResponse) {
        var tab = sender.tab;
        chrome.tabs.query({
            windowId: tab.windowId
        }, function(tabs) {
            tabs = _filterByTitleOrUrl(tabs, message.query);
            if (message.query && message.query.length) {
                tabs = tabs.filter(function(b) {
                    return b.title.indexOf(message.query) !== -1 || (b.url && b.url.indexOf(message.query) !== -1);
                });
            }
            tabs = tabs.filter(function(b) {
                return b.id !== tab.id;
            });
            if (settings.tabsMRUOrder) {
                tabs.sort(function(a, b) {
                    return tabActivated[b.id] - tabActivated[a.id];
                });
            }
            _response(message, sendResponse, {
                tabs: tabs
            });
        });
    };
    self.togglePinTab = function(message, sender, sendResponse) {
        chrome.tabs.getSelected(null, function(tab) {
            return chrome.tabs.update(tab.id, {
                pinned: !tab.pinned
            });
        });
    };
    self.focusTab = function(message, sender, sendResponse) {
        chrome.tabs.update(message.tab_id, {
            active: true
        });
    };
    self.historyTab = function(message, sender, sendResponse) {
        if (tabHistory.length > 0) {
            historyTabAction = true;
            tabHistoryIndex += message.backward ? -1 : 1;
            if (tabHistoryIndex < 0) {
                tabHistoryIndex = 0;
            } else if (tabHistoryIndex >= tabHistory.length) {
                tabHistoryIndex = tabHistory.length - 1;
            }
            var tab_id = tabHistory[tabHistoryIndex];
            chrome.tabs.update(tab_id, {
                active: true
            });
        }
    };
    // limit to between 0 and length
    function _fixTo(to, length) {
        if (to < 0) {
            to = 0;
        } else if (to >= length){
            to = length;
        }
        return to;
    }
    // round base ahead if repeats reaches length
    function _roundBase(base, repeats, length) {
        if (repeats > length - base) {
            base -= repeats - (length - base);
        }
        return base;
    }
    function _nextTab(tab, step) {
        chrome.tabs.query({
            windowId: tab.windowId
        }, function(tabs) {
            if (tab.index == 0 && step == -1) {
                step = tabs.length -1 ;
            } else if (tab.index == tabs.length -1 && step == 1 ) {
                step = 1 - tabs.length ;
            }
            var to = _fixTo(tab.index + step, tabs.length - 1);
            chrome.tabs.update(tabs[to].id, {
                active: true
            });
        });
    }
    self.nextTab = function(message, sender, sendResponse) {
        _nextTab(sender.tab, message.repeats);
    };
    self.previousTab = function(message, sender, sendResponse) {
        _nextTab(sender.tab, -message.repeats);
    };
    function _roundRepeatTabs(tab, repeats, operation) {
        chrome.tabs.query({
            windowId: tab.windowId
        }, function(tabs) {
            var tabIds = tabs.map(function(e) {
                return e.id;
            });
            repeats = _fixTo(repeats, tabs.length);
            var base = _roundBase(tab.index, repeats, tabs.length);
            operation(tabIds.slice(base, base + repeats));
        });
    }
    self.reloadTab = function(message, sender, sendResponse) {
        _roundRepeatTabs(sender.tab, message.repeats, function(tabIds) {
            tabIds.forEach(function(tabId) {
                chrome.tabs.reload(tabId, {
                    bypassCache: message.nocache
                });
            });
        });
    };
    self.closeTab = function(message, sender, sendResponse) {
        _roundRepeatTabs(sender.tab, message.repeats, function(tabIds) {
            chrome.tabs.remove(tabIds);
        });
    };
    self.muteTab = function(message, sender, sendResponse) {
        var tab = sender.tab;
        chrome.tabs.update(tab.id, {
            muted: ! tab.mutedInfo.muted
        });
    };
    self.openLast = function(message, sender, sendResponse) {
        chrome.sessions.restore();
    };
    self.duplicateTab = function(message, sender, sendResponse) {
        chrome.tabs.duplicate(sender.tab.id);
    };
    self.getBookmarkFolders = function(message, sender, sendResponse) {
        chrome.bookmarks.getTree(function(tree) {
            bookmarkFolders = [];
            getFolders(tree[0], "");
            _response(message, sendResponse, {
                folders: bookmarkFolders
            });
        });
    };
    self.createBookmark = function(message, sender, sendResponse) {
        createBookmark(message.page, function(ret) {
            _response(message, sendResponse, {
                bookmark: ret
            });
        });
    };
    self.getBookmarks = function(message, sender, sendResponse) {
        if (message.parentId) {
            chrome.bookmarks.getSubTree(message.parentId, function(tree) {
                var bookmarks = tree[0].children;
                if (message.query && message.query.length) {
                    bookmarks = bookmarks.filter(function(b) {
                        return b.title.indexOf(message.query) !== -1 || (b.url && b.url.indexOf(message.query) !== -1);
                    });
                }
                _response(message, sendResponse, {
                    bookmarks: bookmarks
                });
            });
        } else {
            if (message.query && message.query.length) {
                chrome.bookmarks.search(message.query, function(tree) {
                    _response(message, sendResponse, {
                        bookmarks: tree
                    });
                });
            } else {
                chrome.bookmarks.getTree(function(tree) {
                    _response(message, sendResponse, {
                        bookmarks: tree[0].children
                    });
                });
            }
        }
    };
    self.getHistory = function(message, sender, sendResponse) {
        message.query.maxResults = 2147483647;
        chrome.history.search(message.query, function(tree) {
            _response(message, sendResponse, {
                history: tree
            });
        });
    };
    self.openLink = function(message, sender, sendResponse) {
        if (message.tab.tabbed) {
            var newTabPosition = null;
            switch (message.position) {
                case 'left':
                    newTabPosition = sender.tab.index;
                    break;
                case 'right':
                    newTabPosition = sender.tab.index + 1;
                    break;
                case 'first':
                    newTabPosition = 0;
                    break;
                default:
                    break;
            }
            chrome.tabs.create({
                url: message.url,
                active: message.tab.active,
                index: newTabPosition,
                pinned: message.tab.pinned
            }, function(tab) {
                if (message.scrollLeft || message.scrollTop) {
                    tabMessages[tab.id] = {
                        scrollLeft: message.scrollLeft,
                        scrollTop: message.scrollTop
                    };
                }
            });
        } else {
            chrome.tabs.update({
                url: message.url,
                pinned: message.tab.pinned || sender.tab.pinned
            }, function(tab) {
                if (message.scrollLeft || message.scrollTop) {
                    tabMessages[tab.id] = {
                        scrollLeft: message.scrollLeft,
                        scrollTop: message.scrollTop
                    };
                }
            });
        }
    };
    self.viewSource = function(message, sender, sendResponse) {
        message.url = 'view-source:' + sender.tab.url;
        self.openLink(message, sender, sendResponse);
    };
    self.getSettings = function(message, sender, sendResponse) {
        _response(message, sendResponse, {
            settings: settings
        });
    };
    self.editSettings = function(message, sender, sendResponse) {
        message.url = optionsURL;
        self.openLink(message, sender, sendResponse);
    };
    self.updateSettings = function(message, sender, sendResponse) {
        _updateSettings(message.settings, message.noack);
    };
    self.changeSettingsStorage = function(message, sender, sendResponse) {
        settings.storage = message.storage;
        chrome.storage.local.set(settings);
        if (settings.storage === 'sync') {
            chrome.storage.sync.set(settings, function() {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError);
                }
            });
        }
    };
    self.setSurfingkeysIcon = function(message, sender, sendResponse) {
        chrome.browserAction.setIcon({
            path: (message.status ? 'icons/48-x.png' : 'icons/48.png'),
            tabId: sender.tab.id
        });
    };
    self.request = function(message, sender, sendResponse) {
        var s = request(message.method, message.url);
        s.then(function(res) {
            _response(message, sendResponse, {
                text: res
            });
        });
    };
    self.nextFrame = function(message, sender, sendResponse) {
        var tid = sender.tab.id;
        chrome.tabs.executeScript(tid, {
            code: "_prepareFrames()"
        }, function(results) {
            var frames = results[0];
            if (!frameIncs.hasOwnProperty(tid)) {
                frameIncs[tid] = 0;
            }
            frameIncs[tid]++;
            frameIncs[tid] = frameIncs[tid] % frames.length;
            chrome.tabs.sendMessage(tid, {
                subject: "focusFrame",
                target: 'content_runtime',
                frameId: frames[frameIncs[tid]]
            });
        });
    };
    self.moveTab = function(message, sender, sendResponse) {
        chrome.tabs.query({
            windowId: sender.tab.windowId
        }, function(tabs) {
            var to = _fixTo(sender.tab.index + message.step * message.repeats, tabs.length);
            chrome.tabs.move(sender.tab.id, {
                index: to
            });
        });
    };
    function _quit() {
        chrome.windows.getAll({
            populate: false
        }, function(windows) {
            windows.forEach(function(w) {
                chrome.windows.remove(w.id);
            });
        });
    }
    self.quit = function(message, sender, sendResponse) {
        _quit();
    };
    self.createSession = function(message, sender, sendResponse) {
        chrome.tabs.query({}, function(tabs) {
            var tabGroup = {};
            tabs.forEach(function(tab) {
                if (tab && tab.index !== void 0) {
                    if (!tabGroup.hasOwnProperty(tab.windowId)) {
                        tabGroup[tab.windowId] = [];
                    }
                    if (tab.url !== newTabUrl) {
                        tabGroup[tab.windowId].push(tab.url);
                    }
                }
            });
            var tabg = [];
            for (var k in tabGroup) {
                if (tabGroup[k].length) {
                    tabg.push(tabGroup[k]);
                }
            }
            settings.sessions[message.name] = {};
            settings.sessions[message.name]['tabs'] = tabg;
            _updateSettings({
                sessions: settings.sessions
            }, false, (message.quitAfterSaved ? _quit : undefined));
        });
    };
    self.getSessions = function(message, sender, sendResponse) {
        _response(message, sendResponse, {
            sessions: settings.sessions
        });
    };
    self.openSession = function(message, sender, sendResponse) {
        if (settings.sessions.hasOwnProperty(message.name)) {
            var urls = settings.sessions[message.name]['tabs'];
            urls[0].forEach(function(url) {
                chrome.tabs.create({
                    url: url,
                    active: false,
                    pinned: false
                });
            });
            for (var i = 1; i < urls.length; i++) {
                var a = urls[i];
                chrome.windows.create({}, function(win) {
                    a.forEach(function(url) {
                        chrome.tabs.create({
                            windowId: win.id,
                            url: url,
                            active: false,
                            pinned: false
                        });
                    });
                });
            }
            chrome.tabs.query({
                url: newTabUrl
            }, function(tabs) {
                chrome.tabs.remove(tabs.map(function(t) {
                    return t.id
                }))
            });
        }
    };
    self.deleteSession = function(message, sender, sendResponse) {
        delete settings.sessions[message.name];
        _updateSettings({
            sessions: settings.sessions
        }, false);
    };
    self.closeDownloadsShelf = function(message, sender, sendResponse) {
        chrome.downloads.erase({"urlRegex": ".*"});
    };
    self.getDownloads = function(message, sender, sendResponse) {
        chrome.downloads.search(message.query, function(items) {
            _response(message, sendResponse, {
                downloads: items
            });
        })
    };
    self.executeScript = function(message, sender, sendResponse) {
        chrome.tabs.executeScript(sender.tab.id, {
            code: message.code
        }, function(result) {
            _response(message, sendResponse, {
                response: result
            });
        });
    };
    self.tabURLAccessed = function(message, sender, sendResponse) {
        var tabId = sender.tab.id;
        if (!tabURLs.hasOwnProperty(tabId)) {
            tabURLs[tabId] = {};
        }
        tabURLs[tabId][message.url] = message.title;
    };
    self.getTabURLs = function(message, sender, sendResponse) {
        var tabURL = tabURLs[sender.tab.id] || {};
        tabURL = Object.keys(tabURL).map(function(u) {
            return {
                url: u,
                title: tabURL[u]
            };
        });
        _response(message, sendResponse, {
            urls: tabURL
        });
    };

    function FindProxyForURL(url, host) {
        var lastPos;
        if (settings.proxyMode === "always") {
            return settings.proxy;
        }
        var pp = new RegExp(settings.autoproxy_pattern);
        do {
            if (settings.autoproxy_hosts.hasOwnProperty(host)) {
                return settings.proxy;
            }
            if (settings.autoproxy_pattern.length && pp.test(host)) {
                return settings.proxy;
            }
            lastPos = host.indexOf('.') + 1;
            host = host.slice(lastPos);
        } while (lastPos >= 1);
        return 'DIRECT';
    }
    self.updateProxy = function(message, sender, sendResponse) {
        if (message.proxy) {
            settings.proxy = message.proxy;
        }
        if (message.mode) {
            settings.proxyMode = message.mode;
        }
        if (message.host) {
            if (message.operation === "add") {
                message.host.split(',').forEach(function(host) {
                    settings.autoproxy_hosts[host] = 1;
                });
            } else {
                message.host.split(',').forEach(function(host) {
                    delete settings.autoproxy_hosts[host];
                });
            }
        }
        _updateSettings({
            autoproxy_hosts: settings.autoproxy_hosts,
            proxyMode: settings.proxyMode,
            proxy: settings.proxy
        }, false);
        if (message.mode === 'clear') {
            chrome.proxy.settings.clear({scope: 'regular'});
        } else {
            var autoproxy_pattern = Object.keys(settings.autoproxy_hosts).filter(function(a) {
                return a.indexOf('*') !== -1;
            }).join('|');
            var config = {
                mode: (settings.proxyMode === "always" || settings.proxyMode === "byhost") ? "pac_script" : settings.proxyMode,
                pacScript: {
                    data: "var settings = {}; settings.autoproxy_hosts = " + JSON.stringify(settings.autoproxy_hosts)
                    + ", settings.autoproxy_pattern = '" + autoproxy_pattern
                    + "', settings.proxyMode = '" + settings.proxyMode
                    + "', settings.proxy = '" + settings.proxy + "'; "
                    + FindProxyForURL.toString()
                }
            };
            chrome.proxy.settings.set( {value: config, scope: 'regular'}, function() {
            });
        }
    };
    self.setZoom = function(message, sender, sendResponse) {
        var tabId = sender.tab.id;
        if (message.zoomFactor == 0) {
            chrome.tabs.setZoom(tabId, 1);
        } else {
            chrome.tabs.getZoom(tabId, function(zf) {
                chrome.tabs.setZoom(tabId, zf + message.zoomFactor);
            });
        }
    };
    self.removeURL = function(message, sender, sendResponse) {
        if (/^\d+$/.test(message.uid)) {
            chrome.bookmarks.remove(message.uid, function() {
                _response(message, sendResponse, {
                    response: "Done"
                });
            });
        } else {
            chrome.history.deleteUrl({url: message.uid}, function () {
                _response(message, sendResponse, {
                    response: "Done"
                });
            });
        }
    };

    return self;
})();
