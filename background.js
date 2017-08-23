function request(url, onReady, headers, data, onException) {
    headers = headers || {};
    return new Promise(function(acc, rej) {
        var xhr = new XMLHttpRequest();
        var method = (data !== undefined) ? "POST" : "GET";
        xhr.open(method, url);
        for (var h in headers) {
            xhr.setRequestHeader(h, headers[h]);
        }
        xhr.onload = function() {
            acc(xhr.responseText);
        };
        xhr.onerror = rej.bind(null, xhr);
        xhr.send(data);
    }).then(onReady).catch(function(exp) {
        onException && onException(exp);
    });
}

var Gist = (function() {
    var self = {};

    function _initGist(token, magic_word, onGistReady) {
        request("https://api.github.com/gists", function(res) {
            var gists = JSON.parse(res);
            var gist = "";
            gists.forEach(function(g) {
                if (g.hasOwnProperty('description') && g['description'] === magic_word && g.files.hasOwnProperty(magic_word)) {
                    gist = g.id;
                }
            });
            if (gist === "") {
                request("https://api.github.com/gists", function(res) {
                    var ng = JSON.parse(res);
                    onGistReady(ng.id);
                }, {
                    'Authorization': 'token ' + token
                }, `{ "description": "${magic_word}", "public": false, "files": { "${magic_word}": { "content": "${magic_word}" } } }`);
            } else {
                onGistReady(gist);
            }
        }, {
            'Authorization': 'token ' + token
        });
    }

    var _token, _gist = "", _comments = [];
    self.initGist = function(token, onGistReady) {
        if (_token === token && _gist !== "") {
            onGistReady && onGistReady(_gist);
        } else {
            _token = token;
            _initGist(_token, "cloudboard", function(gist) {
                _gist = gist;
                onGistReady && onGistReady(_gist);
            });
        }
    };

    function _newComment(text, cb) {
        request(`https://api.github.com/gists/${_gist}/comments`, function(res) {
            cb && cb(res);
        }, {
            'Authorization': 'token ' + _token
        }, `{"body": "${encodeURIComponent(text)}"}`);
    }
    function _readComment(cid, cb) {
        request(`https://api.github.com/gists/${_gist}/comments/${cid}`, function(res) {
            var comment = JSON.parse(res);
            cb({status: 0, content: decodeURIComponent(comment.body)});
        }, {
            'Authorization': 'token ' + _token
        });
    }
    function _listComment(cb) {
        request(`https://api.github.com/gists/${_gist}/comments`, function(res) {
            _comments = JSON.parse(res).map(function(c) {
                return c.id;
            });
            cb(_comments);
        }, {
            'Authorization': 'token ' + _token
        });
    }
    function _writeComment(cid, clip, cb) {
        request(`https://api.github.com/gists/${_gist}/comments/${cid}`, function(res) {
            cb && cb(res);
        }, {
            'Authorization': 'token ' + _token
        }, `{"body": "${encodeURIComponent(clip)}"}`);
    }
    self.readComment = function(nr, cb) {
        if (_gist === "") {
            cb({status: 1, content: "Please call initGist first!"});
        } else if (nr >= _comments.length) {
            _listComment(function(cmts) {
                if (nr < cmts.length) {
                    _readComment(cmts[nr], cb);
                } else {
                    cb({status: 1, content: "Register not exists!"});
                }
            });
        } else {
            _readComment(_comments[nr], cb);
        }
    };
    self.editComment = function(nr, clip, cb) {
        if (_gist === "") {
            cb({status: 1, content: "Please call initGist first!"});
        } else if (nr >= _comments.length) {
            _listComment(function(cmts) {
                if (nr < cmts.length) {
                    _writeComment(cmts[nr], clip, cb);
                } else {
                    var toCreate = nr - cmts.length + 1;
                    function cbAfterCreated() {
                        toCreate --;
                        if (toCreate > 0) {
                            _newComment(".", cbAfterCreated);
                        } else if (toCreate === 0) {
                            _newComment(clip, cb);
                        }
                    }
                    cbAfterCreated();
                }
            });
        } else {
            _writeComment(_comments[nr], clip, cb);
        }
    };

    return self;
})();

var ChromeService = (function() {
    var self = {};

    var activePorts = [],
        tabHistory = [],
        tabHistoryIndex = 0,
        historyTabAction = false;

    // data by tab id
    var tabActivated = {},
        tabMessages = {},
        frames = {},
        tabURLs = {},
        tabErrors = {};

    var newTabUrl = "chrome://newtab/";

    var conf = {
        focusAfterClosed: "right",
        repeatThreshold: 99,
        tabsMRUOrder: true,
        newTabPosition: 'default',
        interceptedErrors: []
    };

    function extendObject(target, ss) {
        for (var k in ss) {
            target[k] = ss[k];
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

    function handleMessage(_message, _sender, _sendResponse, _port) {
        var tid = 0;
        // no tab set if message is from pages/popup.html
        if (_sender.tab) {
            tid = _sender.tab.id;
            if (!frames.hasOwnProperty(tid)) {
                frames[tid] = {index: 0, list: []};
            }
            if (_message.windowId && frames[tid].list.indexOf(_message.windowId) === -1) {
                frames[tid].list.push(_message.windowId);
            }
        }
        if (_message && _message.target !== 'content_runtime') {
            if (self.hasOwnProperty(_message.action)) {
                if (_message.repeats > conf.repeatThreshold) {
                    _message.repeats = conf.repeatThreshold;
                }
                // runtime.command from popup.js has _sender.tab undefined.
                try {
                    self[_message.action](_message, _sender, _sendResponse);
                } catch (e) {
                    console.log(_message.action + ": " + e);
                }
            } else {
                var type = _port ? "[unexpected port message] " : "[unexpected runtime message] ";
                console.log(type + JSON.stringify(_message))
            }
        }
    }

    function getSubSettings(set, keys) {
        var subset;
        if (!keys) {
            // if null/undefined/""
            subset = set;
        } else {
            if ( !(keys instanceof Array) ) {
                keys = [ keys ];
            }
            subset = {};
            keys.forEach(function(k) {
                subset[k] = set[k];
            });
        }
        return subset;
    }

    function loadRawSettings(keys, cb, defaultSet) {
        var rawSet = defaultSet || {};
        chrome.storage.local.get(null, function(localSet) {
            var localSavedAt = localSet.savedAt || 0;
            chrome.storage.sync.get(null, function(syncSet) {
                var syncSavedAt = syncSet.savedAt || 0;
                if (localSavedAt > syncSavedAt) {
                    extendObject(rawSet, localSet);
                    _save(chrome.storage.sync, localSet, function() {
                        var subset = getSubSettings(rawSet, keys);
                        if (chrome.runtime.lastError) {
                            subset.error = "Settings sync may not work thoroughly because of: " + chrome.runtime.lastError.message;
                        }
                        cb(subset);
                    });
                } else if (localSavedAt < syncSavedAt) {
                    extendObject(rawSet, syncSet);
                    cb(getSubSettings(rawSet, keys));
                    _save(chrome.storage.local, syncSet);
                } else {
                    extendObject(rawSet, localSet);
                    cb(getSubSettings(rawSet, keys));
                }
            });
        });
    }

    function loadSettings(keys, cb) {
        var tmpSet = {
            blacklist: {},
            marks: {},
            findHistory: [],
            cmdHistory: [],
            sessions: {},
            autoproxy_hosts: [],
            proxyMode: 'clear',
            proxy: "DIRECT",
        };

        loadRawSettings(keys, function(set) {
            if (set.localPath) {
                request(set.localPath, function(resp) {
                    set.snippets = resp;
                    cb(set);
                }, function(po) {
                    // failed to read snippets from localPath
                    set.error = "Failed to read snippets from " + set.localPath;
                    cb(set);
                });
            } else {
                cb(set);
            }
        }, tmpSet);
    }

    function dictFromArray(arry, val) {
        var dict = {};
        arry.forEach(function(h) {
            dict[h] = val;
        });
        return dict;
    }

    function _applyProxySettings(proxyConf) {
        if (!proxyConf.proxyMode || proxyConf.proxyMode === 'clear') {
            chrome.proxy.settings.clear({scope: 'regular'});
        } else {
            var autoproxy_pattern = proxyConf.autoproxy_hosts.filter(function(a) {
                return a.indexOf('*') !== -1;
            }).join('|');
            var config = {
                mode: (proxyConf.proxyMode === "always" || proxyConf.proxyMode === "byhost") ? "pac_script" : proxyConf.proxyMode,
                pacScript: {
                    data: `var pacGlobal = {
                        hosts: ${JSON.stringify(dictFromArray(proxyConf.autoproxy_hosts, 1))},
                        autoproxy_pattern: '${autoproxy_pattern}',
                        proxyMode: '${proxyConf.proxyMode}',
                        proxy: '${proxyConf.proxy}'
                    };
                    function FindProxyForURL(url, host) {
                        var lastPos;
                        if (pacGlobal.proxyMode === "always") {
                            return pacGlobal.proxy;
                        }
                        var pp = new RegExp(pacGlobal.autoproxy_pattern);
                        do {
                            if (pacGlobal.hosts.hasOwnProperty(host)) {
                                return pacGlobal.proxy;
                            }
                            if (pacGlobal.autoproxy_pattern.length && pp.test(host)) {
                                return pacGlobal.proxy;
                            }
                            lastPos = host.indexOf('.') + 1;
                            host = host.slice(lastPos);
                        } while (lastPos >= 1);
                        return 'DIRECT';
                    }`
                }
            };
            chrome.proxy.settings.set( {value: config, scope: 'regular'}, function() {
            });
        }
    }

    loadSettings(null, _applyProxySettings);

    chrome.webRequest.onErrorOccurred.addListener(function(details) {
        var tabId = details.tabId;
        if (tabId !== -1 && (conf.interceptedErrors.indexOf("*") !== -1 || conf.interceptedErrors.indexOf(details.error) !== -1)) {
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

    chrome.extension.onConnect.addListener(function(port) {
        var sender = port.sender;
        activePorts.push(port);
        port.onMessage.addListener(function(message, port) {
            return handleMessage(message, port.sender, function(resp) {
                try {
                    if (!port.isDisconnected) {
                        port.postMessage(resp)
                    }
                } catch (e) {
                    console.log(message.action + ": " + e);
                    console.log(port);
                }
            }, port);
        });
        port.onDisconnect.addListener(function() {
            port.isDisconnected = true;
            for (var i = 0; i < activePorts.length; i++) {
                if (activePorts[i] === port) {
                    activePorts.splice(i, 1);
                    break;
                }
            }
        });
    });

    function removeTab(tabId) {
        delete tabActivated[tabId];
        delete tabMessages[tabId];
        delete tabURLs[tabId];
        delete tabErrors[tabId];
        delete frames[tabId];
        tabHistory = tabHistory.filter(function(e) {
            return e !== tabId;
        });
        if (_queueURLs.length) {
            chrome.tabs.create({
                active: false,
                url: _queueURLs.shift()
            });
        }
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
            delete frames[tabId];
        }
        _setScrollPos_bg(tabId);
    });
    chrome.tabs.onCreated.addListener(function(tabId, changeInfo, tab) {
        _setScrollPos_bg(tabId);
    });
    chrome.tabs.onActivated.addListener(function(activeInfo) {
        if (tabURLs.hasOwnProperty(activeInfo.tabId) && !historyTabAction && activeInfo.tabId != tabHistory[tabHistory.length - 1]) {
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
            case 'previousTab':
            case 'nextTab':
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    var tab = tabs[0];
                    var index = (command === 'previousTab') ? tab.index - 1 : tab.index + 1;
                    chrome.tabs.query({ windowId: tab.windowId }, function(tabs) {
                        index = ((index % tabs.length) + tabs.length) % tabs.length;
                        chrome.tabs.update(tabs[index].id, { active: true });
                    });
                });
                break;
            case 'closeTab':
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    chrome.tabs.remove(tabs[0].id);
                });
                break;
            case 'proxyThis':
                chrome.tabs.query({
                    currentWindow: true,
                    active: true
                }, function(resp) {
                    var host = new URL(resp[0].url).host;
                    updateProxy({
                        host: host,
                        operation: "toggle"
                    }, function() {
                        chrome.tabs.reload(resp[0].id, {
                            bypassCache: true
                        });
                    });
                });
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


    function _save(storage, data, cb) {
        if (data.localPath) {
            delete data.snippets;
        }
        storage.set(data, cb);
    }

    function _updateSettings(diffSettings, afterSet) {
        diffSettings.savedAt = new Date().getTime();
        _save(chrome.storage.local, diffSettings, function() {
            if (afterSet) {
                afterSet();
            }
        });
        _save(chrome.storage.sync, diffSettings, function() {
            if (chrome.runtime.lastError) {
                var error = chrome.runtime.lastError.message;
            }
        });
    }
    function _updateAndPostSettings(diffSettings, afterSet) {
        activePorts.forEach(function(port) {
            port.postMessage({
                action: 'settingsUpdated',
                settings: diffSettings
            });
        });
        _updateSettings(diffSettings, afterSet);
    }

    function _getDisabled(set, url, regex) {
        if (set.blacklist['.*']) {
            return true;
        }
        if (url) {
            if (set.blacklist[url.origin]) {
                return true;
            }
            if (regex) {
                regex = new RegExp(regex.source, regex.flags);
                return regex.test(url.href);
            }
        }
        return false;
    }
    self.toggleBlacklist = function(message, sender, sendResponse) {
        loadSettings('blacklist', function(data) {
            var origin = ".*";
            if (sender.tab && sender.tab.url.indexOf(chrome.extension.getURL("")) !== 0) {
                origin = new URL(sender.tab.url).origin;
            }
            if (data.blacklist.hasOwnProperty(origin)) {
                delete data.blacklist[origin];
            } else {
                data.blacklist[origin] = 1;
            }
            _updateAndPostSettings({blacklist: data.blacklist}, function() {
                _response(message, sendResponse, {
                    disabled: _getDisabled(data, sender.tab ? new URL(sender.tab.url) : null, message.blacklistPattern),
                    blacklist: data.blacklist,
                    url: origin
                });
            });
        });
    };
    self.getDisabled = function(message, sender, sendResponse) {
        loadSettings('blacklist', function(data) {
            _response(message, sendResponse, {
                disabled: _getDisabled(data, new URL(sender.tab.url), message.blacklistPattern)
            });
        });
    };

    self.addVIMark = function(message, sender, sendResponse) {
        loadSettings('marks', function(data) {
            extendObject(data.marks, message.mark);
            _updateAndPostSettings({marks: data.marks});
        });
    };

    function _loadSettingsFromUrl(url) {
        request(url, function(resp) {
            _updateAndPostSettings({localPath: url, snippets: resp});
        });
    };

    self.resetSettings = function(message, sender, sendResponse) {
        chrome.storage.local.clear();
        chrome.storage.sync.clear();
        loadSettings(null, function(data) {
            _applyProxySettings();
            _response(message, sendResponse, {
                settings: data
            });
        });
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
    function _getHistory(cb, sortByMostUsed) {
        chrome.history.search({
            startTime: 0,
            maxResults: 2147483647,
            text: ""
        }, function(tree) {
            if (sortByMostUsed) {
                tree = tree.sort(function(a, b) {
                    return b.visitCount - a.visitCount;
                });
            }
            cb(tree);
        });
    }
    self.getAllURLs = function(message, sender, sendResponse) {
        chrome.bookmarks.getRecent(2147483647, function(tree) {
            var urls = tree;
            _getHistory(function(tree) {
                urls = urls.concat(tree);
                _response(message, sendResponse, {
                    urls: urls
                });
            }, true);
        });
    };
    self.getTabs = function(message, sender, sendResponse) {
        var tab = sender.tab;
        var queryInfo = message.queryInfo || {};
        chrome.tabs.query(queryInfo, function(tabs) {
            tabs = _filterByTitleOrUrl(tabs, message.query);
            if (message.query && message.query.length) {
                tabs = tabs.filter(function(b) {
                    return b.title.indexOf(message.query) !== -1 || (b.url && b.url.indexOf(message.query) !== -1);
                });
            }
            tabs = tabs.filter(function(b) {
                return b.id !== tab.id;
            });
            if (conf.tabsMRUOrder) {
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
        if (message.window_id !== undefined && sender.tab.windowId !== message.window_id) {
            chrome.windows.update(message.window_id, {
                focused: true
            }, function() {
                chrome.tabs.update(message.tab_id, {
                    active: true
                });
            });
        } else {
            chrome.tabs.update(message.tab_id, {
                active: true
            });
        }
    };
    self.focusTabByIndex = function(message, sender, sendResponse) {
        var queryInfo = message.queryInfo || {};
        chrome.tabs.query(queryInfo, function(tabs) {
            if (message.repeats > 0 && message.repeats <= tabs.length) {
                chrome.tabs.update(tabs[message.repeats - 1].id, {
                    active: true
                });
            }
        });
    };
    self.historyTab = function(message, sender, sendResponse) {
        if (tabHistory.length > 0) {
            historyTabAction = true;
            if (message.hasOwnProperty("index")) {
                tabHistoryIndex = (parseInt(message.index) + tabHistory.length) % tabHistory.length;
            } else {
                tabHistoryIndex += message.backward ? -1 : 1;
                if (tabHistoryIndex < 0) {
                    tabHistoryIndex = 0;
                } else if (tabHistoryIndex >= tabHistory.length) {
                    tabHistoryIndex = tabHistory.length - 1;
                }
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
            chrome.tabs.remove(tabIds, function() {
                if ( conf.focusAfterClosed === "left" ) {
                    _nextTab(sender.tab, -1);
                }
            });
        });
    };

    function _closeTab(s, n) {
        chrome.tabs.query({currentWindow: true}, function(tabs) {
            tabs = tabs.map(function(e) { return e.id; });
            chrome.tabs.remove(tabs.slice(s.tab.index + (n < 0 ? n : 1),
                                          s.tab.index + (n < 0 ? 0 : 1 + n)));
        });
    };

    self.closeTabLeft  = function(message, sender, senderResponse) { _closeTab(sender, -message.repeats)};
    self.closeTabRight = function(message, sender, senderResponse) { _closeTab(sender, message.repeats); };
    self.closeTabsToLeft = function(message, sender, senderResponse) { _closeTab(sender, -sender.tab.index); };
    self.closeTabsToRight = function(message, sender, senderResponse) {
        chrome.tabs.query({currentWindow: true},
                          function(tabs) { _closeTab(sender, tabs.length - sender.tab.index); });
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
    self.newWindow = function(message, sender, sendResponse) {
        chrome.tabs.query({}, function(tabs) {
            var tabInWindow = {};
            tabs.forEach(function(t) {
                tabInWindow[t.windowId] = tabInWindow[t.windowId] || [];
                tabInWindow[t.windowId].push(t.id);
            });
            if (tabInWindow[sender.tab.windowId] && tabInWindow[sender.tab.windowId].length === 1) {
                // if there is only one tab in current window,
                // then move this tab into the window with most tabs.
                var maximumTab = 0, windowWithMostTab;
                for (var w in tabInWindow) {
                    if (tabInWindow[w].length > maximumTab) {
                        maximumTab = tabInWindow[w].length;
                        windowWithMostTab = w;
                    }
                }
                chrome.tabs.move(sender.tab.id, {windowId: parseInt(windowWithMostTab), index: -1});
            } else {
                chrome.windows.create({tabId: sender.tab.id});
            }
        });
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
        removeBookmark(message.page.url, function() {
            createBookmark(message.page, function(ret) {
                _response(message, sendResponse, {
                    bookmark: ret
                });
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
        _getHistory(function(tree) {
            _response(message, sendResponse, {
                history: tree
            });
        }, message.sortByMostUsed);
    };
    self.openLink = function(message, sender, sendResponse) {
        if (message.tab.tabbed) {
            var newTabPosition;
            if (sender.tab) {
                switch (conf.newTabPosition) {
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
        var pf = loadSettings;
        if (message.key === "RAW") {
            pf = loadRawSettings;
            message.key = "";
        }
        pf(message.key, function(data) {
            _response(message, sendResponse, {
                settings: data
            });
        });
    };
    self.updateSettings = function(message, sender, sendResponse) {
        if (message.scope === "snippets") {
            // For settings from snippets, don't broadcast the update
            // neither persist into storage
            for (var k in message.settings) {
                if (conf.hasOwnProperty(k)) {
                    conf[k] = message.settings[k];
                }
            }
        } else {
            _updateAndPostSettings(message.settings);
        }
    };
    self.setSurfingkeysIcon = function(message, sender, sendResponse) {
        chrome.browserAction.setIcon({
            path: (message.status ? 'icons/48-x.png' : 'icons/48.png'),
            tabId: (sender.tab ? sender.tab.id : undefined)
        });
    };
    self.request = function(message, sender, sendResponse) {
        request(message.url, function(res) {
            _response(message, sendResponse, {
                text: res
            });
        }, message.headers, message.data);
    };
    self.nextFrame = function(message, sender, sendResponse) {
        var tid = sender.tab.id;
        if (frames.hasOwnProperty(tid)) {
            var framesInTab = frames[tid];
            framesInTab.index ++;
            framesInTab.index = framesInTab.index % framesInTab.list.length;

            chrome.tabs.sendMessage(tid, {
                subject: "focusFrame",
                target: 'content_runtime',
                frameId: framesInTab.list[framesInTab.index]
            });
        }
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
        loadSettings('sessions', function(data) {
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
                data.sessions[message.name] = {};
                data.sessions[message.name]['tabs'] = tabg;
                _updateAndPostSettings({
                    sessions: data.sessions
                }, (message.quitAfterSaved ? _quit : undefined));
            });
        });
    };
    self.openSession = function(message, sender, sendResponse) {
        loadSettings('sessions', function(data) {
            if (data.sessions.hasOwnProperty(message.name)) {
                var urls = data.sessions[message.name]['tabs'];
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
        });
    };
    self.deleteSession = function(message, sender, sendResponse) {
        loadSettings('sessions', function(data) {
            delete data.sessions[message.name];
            _updateAndPostSettings({
                sessions: data.sessions
            });
        });
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
            frameId: sender.frameId,
            code: message.code,
            file: message.file
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
    self.getTopURL = function(message, sender, sendResponse) {
        _response(message, sendResponse, {
            url: sender.tab ? sender.tab.url : ""
        });
    };

    function updateProxy(message, cb) {
        loadSettings(['proxyMode', 'proxy', 'autoproxy_hosts'], function(proxyConf) {
            if (message.proxy) {
                proxyConf.proxy = message.proxy;
            }
            if (message.mode) {
                proxyConf.proxyMode = message.mode;
            }
            if (message.host) {
                var hostsDict = dictFromArray(proxyConf.autoproxy_hosts, 1);
                var hosts = message.host.split(/\s*[ ,\n]\s*/);
                if (message.operation === "toggle") {
                    hosts.forEach(function(host) {
                        if (hostsDict.hasOwnProperty(host)) {
                            delete hostsDict[host];
                        } else {
                            hostsDict[host] = 1;
                        }
                    });
                } else if (message.operation === "add") {
                    hosts.forEach(function(host) {
                        hostsDict[host] = 1;
                    });
                } else {
                    hosts.forEach(function(host) {
                        delete hostsDict[host];
                    });
                }
                proxyConf.autoproxy_hosts = Object.keys(hostsDict);
            }
            var diffSet = {
                autoproxy_hosts: proxyConf.autoproxy_hosts,
                proxyMode: proxyConf.proxyMode,
                proxy: proxyConf.proxy
            };
            _updateAndPostSettings(diffSet);
            _applyProxySettings(proxyConf);
            cb && cb(diffSet);
        });
    }
    self.updateProxy = function(message, sender, sendResponse) {
        updateProxy(message, function(diffSet) {
            _response(message, sendResponse, diffSet);
        });
    };
    self.setZoom = function(message, sender, sendResponse) {
        var tabId = sender.tab.id;
        var zoomFactor = message.zoomFactor * message.repeats;
        if (zoomFactor == 0) {
            chrome.tabs.setZoom(tabId, 1);
        } else {
            chrome.tabs.getZoom(tabId, function(zf) {
                chrome.tabs.setZoom(tabId, zf + zoomFactor);
            });
        }
    };
    function _removeURL(uid, cb) {
        var type = uid[0], uid = uid.substr(1);
        if (type === 'B') {
            chrome.bookmarks.remove(uid, cb);
        } else if (type === 'H') {
            chrome.history.deleteUrl({url: uid}, cb);
        } else if (type === 'T') {
            uid = uid.split(":").map(function(u) {
                return parseInt(u);
            });
            chrome.windows.update(uid[0], {
                focused: true
            }, function() {
                chrome.tabs.remove(uid[1], cb);
            });
        } else if (type === 'M') {
            loadSettings('marks', function(data) {
                delete data.marks[uid];
                _updateAndPostSettings({marks: data.marks}, cb);
            });
        }
    }
    self.removeURL = function(message, sender, sendResponse) {
        var removed = 0,
            totalToRemoved = message.uid.length,
            uid = message.uid;
        if (typeof(message.uid) === "string") {
            totalToRemoved = 1;
            uid = [ message.uid ];
        }
        function _done() {
            removed ++;
            if (removed === totalToRemoved) {
                _response(message, sendResponse, {
                    response: "Done"
                });
            }
        }
        uid.forEach(function(u) {
            _removeURL(u, _done);
        });

    };
    self.localData = function(message, sender, sendResponse) {
        if (message.data.constructor === Object) {
            chrome.storage.local.set(message.data, function() {
                _response(message, sendResponse, {
                    data: "Done"
                });
            });
            // broadcast the change also, such as lastKeys
            // we would set lastKeys in sync to avoid breaching chrome.storage.sync.MAX_WRITE_OPERATIONS_PER_MINUTE
            activePorts.forEach(function(port) {
                port.postMessage({
                    action: 'settingsUpdated',
                    settings: message.data
                });
            });
        } else {
            // string or array of string keys
            chrome.storage.local.get(message.data, function(data) {
                _response(message, sendResponse, {
                    data: data
                });
            });
        }
    };
    self.captureVisibleTab = function(message, sender, sendResponse) {
        chrome.tabs.captureVisibleTab(null, {format: "png"}, function(dataUrl) {
            _response(message, sendResponse, {
                dataUrl: dataUrl
            });
        });
    };
    self.getCaptureSize = function(message, sender, sendResponse) {
        var img = document.createElement( "img" );
        img.onload = function() {
            _response(message, sendResponse, {
                width: img.width,
                height: img.height
            });
        };
        chrome.tabs.captureVisibleTab(null, {format: "png"}, function(dataUrl) {
            img.src = dataUrl;
        });
    };
    self.deleteHistoryOlderThan = function(message, sender, sendResponse) {
        var days = message.days || 0, hours = message.hours || 0;
        chrome.history.deleteRange({
            startTime: 0,
            endTime: new Date().getTime() - (days * 86400 + hours * 3600) * 1000
        }, function() {
        });
    };
    function removeBookmark(url, cb) {
        chrome.bookmarks.search({
            url: url
        }, function(bookmarks) {
            bookmarks.forEach(function(b) {
                chrome.bookmarks.remove(b.id);
            });
            cb && cb();
        });
    }
    self.removeBookmark = function(message, sender, sendResponse) {
        removeBookmark(sender.tab.url);
    };
    self.getBookmark = function(message, sender, sendResponse) {
        chrome.bookmarks.search({
            url: sender.tab.url
        }, function(bookmarks) {
            _response(message, sendResponse, {
                bookmarks: bookmarks
            });
        });
    };

    self.initGist = function(message, sender, sendResponse) {
        Gist.initGist(message.token, function(gist) {
            _response(message, sendResponse, {
                gist: gist
            });
        });
    };
    self.readComment = function(message, sender, sendResponse) {
        Gist.readComment(message.index, function(resp) {
            _response(message, sendResponse, resp);
        });
    };
    self.editComment = function(message, sender, sendResponse) {
        Gist.editComment(message.index, message.content, function(resp) {
            _response(message, sendResponse, {gistResp: resp});
        });
    };

    var _queueURLs = [];
    self.queueURLs = function(message, sender, sendResponse) {
        _queueURLs = _queueURLs.concat(message.urls);
    };
    self.getQueueURLs = function(message, sender, sendResponse) {
        _response(message, sendResponse, {
            queueURLs: _queueURLs
        });
    };

    self.getVoices = function(message, sender, sendResponse) {
        chrome.tts.getVoices(function(voices) {
            _response(message, sendResponse, {
                voices: voices
            });
        });
    };

    self.read = function(message, sender, sendResponse) {
        var options = message.options || {};
        options.onEvent = function(ttsEvent) {
            _response(message, sendResponse, {
                ttsEvent: ttsEvent
            });
        };
        chrome.tts.speak(message.content, options);
    };
    self.stopReading = function(message, sender, sendResponse) {
        chrome.tts.stop();
    };

    return self;
})();
