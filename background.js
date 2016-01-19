var Service = (function() {
    var self = {}, onResponseById = {};

    var activePorts = [],
        frontEndPorts = {},
        contentPorts = {},
        tabActivated = {},
        frameIncs = {},
        tabHistory = [],
        tabHistoryIndex = 0,
        historyTabAction = false,
        optionsURL = chrome.extension.getURL('/pages/options.html'),
        frontEndURL = chrome.extension.getURL('/pages/frontend.html');

    var settings = {
        maxResults: 500,
        tabsThreshold: 9,
        tabsMRUOrder: true,
        smoothScroll: true,
        blacklist: {},
        marks: {},
        findHistory: [],
        cmdHistory: [],
        version: chrome.runtime.getManifest().version,
        snippets: "",
        sessions: {},
        newTabPosition: 'right',
        afterYank: 1,
        autoproxy_hosts: {},
        proxyMode: 'byhost',
        proxy: "DIRECT",
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

    chrome.storage.local.get(null, function(data) {
        if (!data.version || parseFloat(data.version) < 0.11) {
            if (JSON.stringify(data) !== '{}') {
                chrome.storage.local.clear();
                chrome.storage.sync.clear();
            }
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
                });
            }
        }
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

    function handleMessage(_message, _sender, _sendResponse, _port) {
        if (_message && _message.target !== 'content_runtime') {
            if (self.hasOwnProperty(_message.action)) {
                _message.repeats = _message.repeats || 1;
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
                    _message.error = e.toString();
                    _sendResponse(_message);
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
    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.extension.onConnect.addListener(function(port) {
        var sender = port.sender;
        if (sender.url === frontEndURL) {
            frontEndPorts[sender.tab.id] = port;
        }
        activePorts.push(port);
        port.postMessage({
            action: 'initSettings',
            settings: settings,
            extension_id: chrome.i18n.getMessage("@@extension_id")
        });
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

    function unRegisterFrame(tabId) {
        if (frameIncs.hasOwnProperty(tabId)) {
            delete frameIncs[tabId];
        }
    }

    function removeTab(tabId) {
        delete contentPorts[tabId];
        delete frontEndPorts[tabId];
        unRegisterFrame(tabId);
        tabHistory = tabHistory.filter(function(e) {
            return e !== tabId;
        });
    }
    chrome.tabs.onRemoved.addListener(removeTab);
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if (changeInfo.status === "loading") {
            unRegisterFrame(tabId);
        }
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

    function _updateSettings(diffSettings) {
        var toSet = diffSettings || settings;
        chrome.storage.local.set(toSet);
        if (settings.storage === 'sync') {
            chrome.storage.sync.set(toSet, function() {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError);
                }
            });
        }
        activePorts.forEach(function(port) {
            port.postMessage({
                action: 'settingsUpdated',
                settings: settings
            });
        });
    }

    function _loadSettingsFromUrl(url) {
        var s = request('get', url);
        s.then(function(resp) {
            settings.localPath = url;
            settings.snippets = resp;
            _updateSettings();
        });
    };

    self.resetSettings = function(message, sender, sendResponse) {
        if (message.useDefault) {
            delete settings.localPath;
            settings.snippets = "";
            _updateSettings();
        } else if (settings.localPath) {
            _loadSettingsFromUrl(settings.localPath);
        } else {
            settings.snippets = "";
            _updateSettings();
        }
    };
    self.loadSettingsFromUrl = function(message, sender, sendResponse) {
        _loadSettingsFromUrl(message.url);
    };
    self.getTabs = function(message, sender, sendResponse) {
        var tab = sender.tab;
        chrome.tabs.query({
            currentWindow: true
        }, function(tabs) {
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
            sendResponse({
                action: message.action,
                id: message.id,
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
    self.nextTab = function(message, sender, sendResponse) {
        var tab = sender.tab;
        chrome.tabs.query({
            windowId: tab.windowId
        }, function(tabs) {
            chrome.tabs.update(tabs[(((tab.index + 1) % tabs.length) + tabs.length) % tabs.length].id, {
                active: true
            });
        });
    };
    self.previousTab = function(message, sender, sendResponse) {
        var tab = sender.tab;
        chrome.tabs.query({
            windowId: tab.windowId
        }, function(tabs) {
            return chrome.tabs.update(tabs[(((tab.index - 1) % tabs.length) + tabs.length) % tabs.length].id, {
                active: true
            });
        });
    };
    self.reloadTab = function(message, sender, sendResponse) {
        chrome.tabs.reload({
            bypassCache: message.nocache
        });
    };
    self.closeTab = function(message, sender, sendResponse) {
        chrome.tabs.query({
            currentWindow: true
        }, function(tabs) {
            var sortedIds = tabs.map(function(e) {
                return e.id;
            });
            var base = sender.tab.index;
            if (message.repeats > sortedIds.length - base) {
                base -= message.repeats - (sortedIds.length - base);
            }
            if (base < 0) {
                base = 0;
            }
            chrome.tabs.remove(sortedIds.slice(base, base + message.repeats));
        });
    };
    self.openLast = function(message, sender, sendResponse) {
        for (var i = 0; i < message.repeats; i++) {
            chrome.sessions.restore();
        }
    };
    self.duplicateTab = function(message, sender, sendResponse) {
        for (var i = 0; i < message.repeats; i++) {
            chrome.tabs.duplicate(sender.tab.id);
        }
    };
    self.getBookmarkFolders = function(message, sender, sendResponse) {
        chrome.bookmarks.getTree(function(tree) {
            bookmarkFolders = [];
            getFolders(tree[0], "");
            sendResponse({
                action: message.action,
                id: message.id,
                folders: bookmarkFolders
            });
        });
    };
    self.createBookmark = function(message, sender, sendResponse) {
        createBookmark(message.page, function(ret) {
            sendResponse({
                action: message.action,
                id: message.id,
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
                sendResponse({
                    action: message.action,
                    id: message.id,
                    bookmarks: bookmarks
                });
            });
        } else {
            if (message.query && message.query.length) {
                chrome.bookmarks.search(message.query, function(tree) {
                    sendResponse({
                        action: message.action,
                        id: message.id,
                        bookmarks: tree
                    });
                });
            } else {
                chrome.bookmarks.getTree(function(tree) {
                    sendResponse({
                        action: message.action,
                        id: message.id,
                        bookmarks: tree[0].children
                    });
                });
            }
        }
    };
    self.getHistory = function(message, sender, sendResponse) {
        chrome.history.search(message.query, function(tree) {
            sendResponse({
                action: message.action,
                id: message.id,
                history: tree
            });
        });
    };
    self.getURLs = function(message, sender, sendResponse) {
        chrome.bookmarks.search(message.query, function(tree) {
            var bookmarks = tree;
            var vacancy = message.maxResults - bookmarks.length;
            if (vacancy > 0) {
                chrome.history.search({
                    text: message.query,
                    startTime: 0,
                    maxResults: vacancy
                }, function(tree) {
                    sendResponse({
                        action: message.action,
                        id: message.id,
                        urls: tree.concat(bookmarks)
                    });
                });
            } else {
                sendResponse({
                    action: message.action,
                    id: message.id,
                    urls: bookmarks
                });
            }
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
            for (var i = 0; i < message.repeats; ++i) {
                chrome.tabs.create({
                    url: message.url,
                    active: message.tab.active,
                    index: newTabPosition,
                    pinned: message.tab.pinned
                });
            }
        } else {
            chrome.tabs.update({
                url: message.url,
                pinned: message.tab.pinned || sender.tab.pinned
            });
        }
    };
    self.viewSource = function(message, sender, sendResponse) {
        message.url = 'view-source:' + sender.tab.url;
        self.openLink(message, sender, sendResponse);
    };
    self.getSettings = function(message, sender, sendResponse) {
        sendResponse({
            action: message.action,
            settings: settings
        });
    };
    self.editSettings = function(message, sender, sendResponse) {
        message.url = optionsURL;
        self.openLink(message, sender, sendResponse);
    };
    self.updateSettings = function(message, sender, sendResponse) {
        extendSettings(message.settings);
        _updateSettings();
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
            sendResponse({
                action: message.action,
                id: message.id,
                text: res
            });
        });
    };
    self.nextFrame = function(message, sender, sendResponse) {
        var tid = sender.tab.id;
        chrome.tabs.executeScript(tid, {
            code: "prepareFrames()"
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
        var newPos = parseInt(message.position);
        var activeTabId = sender.tab.id;
        if (newPos > -1 && newPos < 10) {
            chrome.tabs.move(activeTabId, {
                index: newPos
            });
        }
    };
    self.quit = function(message, sender, sendResponse) {
        chrome.windows.getAll({
            populate: false
        }, function(windows) {
            windows.forEach(function(w) {
                chrome.windows.remove(w.id);
            });
        });
    };
    self.createSession = function(message, sender, sendResponse) {
        settings.sessions[message.name] = {
            'tabs': []
        };
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
            settings.sessions[message.name]['tabs'] = tabg;
            _updateSettings({
                sessions: settings.sessions
            });
        });
    };
    self.getSessions = function(message, sender, sendResponse) {
        sendResponse({
            action: message.action,
            id: message.id,
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
        });
    };

    self.closeDownloadsShelf = function(message, sender, sendResponse) {
        chrome.downloads.setShelfEnabled(false);
        chrome.downloads.setShelfEnabled(true);
    };

    function FindProxyForURL(url, host) {
        var lastPos;
        if (sk_mode === "always") {
            return sk_proxy;
        } else if (sk_mode === "direct") {
            return 'DIRECT';
        }
        do {
            if (proxied_hosts.hasOwnProperty(host)) {
                return sk_proxy;
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
            message.host.split(',').forEach(function(host) {
                if (settings.autoproxy_hosts.hasOwnProperty(host)) {
                    delete settings.autoproxy_hosts[host];
                } else {
                    settings.autoproxy_hosts[host] = 1;
                }
            });
        }
        _updateSettings({
            autoproxy_hosts: settings.autoproxy_hosts,
            proxyMode: settings.proxyMode,
            proxy: settings.proxy
        });
        var config = {
            mode: 'pac_script',
            pacScript: {
                data: "var proxied_hosts = " + JSON.stringify(settings.autoproxy_hosts) + ", sk_mode = '" + settings.proxyMode + "', sk_proxy = '" + settings.proxy + "'; " + FindProxyForURL.toString()
            }
        };
        chrome.proxy.settings.set( {value: config, scope: 'regular'}, function() {
        });
    };

    return self;
})();
