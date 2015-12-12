chrome.commands.onCommand.addListener(function(command) {
    switch (command) {
        case 'restartext':
            chrome.runtime.reload();
            break;
        default:
            break;
    }
});

var Service = {
    activePorts: [],
    frames: {},
    tabHistory: [],
    tabHistoryIndex: 0,
    historyTabAction: false,
};

Service.settings = {
    maxResults: 500,
    tabsThreshold: 9,
    smoothScroll: true,
    blacklist: {},
    marks: {},
    findHistory: [],
    cmdHistory: [],
    version: chrome.runtime.getManifest().version,
    snippets: "",
    sessions: {},
    newTabPosition: 'right',
    storage: 'local'
};

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
        Service.settings[k] = ss[k];
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
                    Service.settings.storage = "sync";
                }
            });
        }
    }
});
Service._updateSettings = function() {
    chrome.storage.local.set(Service.settings);
    if (Service.settings.storage === 'sync') {
        chrome.storage.sync.set(Service.settings, function() {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError);
            }
        });
    }
    Service.activePorts.forEach(function(port) {
        port.postMessage({
            type: 'settingsUpdated',
            settings: Service.settings
        });
    });
}
Service._loadSettingsFromUrl = function(url) {
    var s = request('get', url);
    s.then(function(resp) {
        Service.settings.localPath = url;
        Service.settings.snippets = resp;
        Service._updateSettings();
    });
};
Service.resetSettings = function(message, sender, sendResponse) {
    if (message.useDefault) {
        delete Service.settings.localPath;
        Service.settings.snippets = "";
        Service._updateSettings();
    } else if (Service.settings.localPath) {
        Service._loadSettingsFromUrl(Service.settings.localPath);
    } else {
        Service.settings.snippets = "";
        Service._updateSettings();
    }
};
Service.loadSettingsFromUrl = function(message, sender, sendResponse) {
    Service._loadSettingsFromUrl(message.url);
};
Service.getTabs = function(message, sender, sendResponse) {
    var tab = sender.tab;
    chrome.tabs.query({
    }, function(tabs) {
        if (message.query && message.query.length) {
            tabs = tabs.filter(function(b) {
                return b.title.indexOf(message.query) !== -1 || (b.url && b.url.indexOf(message.query) !== -1);
            });
        }
        sendResponse({
            type: message.action,
            id: message.id,
            tabs: tabs
        });
    });
};
Service.togglePinTab = function(message, sender, sendResponse) {
    chrome.tabs.getSelected(null, function(tab) {
        return chrome.tabs.update(tab.id, {
            pinned: !tab.pinned
        });
    });
};
Service.focusTab = function(message, sender, sendResponse) {
    chrome.tabs.update(message.tab_id, {
        active: true
    });
};
Service.historyTab = function(message, sender, sendResponse) {
    if (Service.tabHistory.length > 0) {
        Service.historyTabAction = true;
        Service.tabHistoryIndex += message.backward ? -1 : 1;
        if (Service.tabHistoryIndex < 0) {
            Service.tabHistoryIndex = 0;
        } else if (Service.tabHistoryIndex >= Service.tabHistory.length) {
            Service.tabHistoryIndex = Service.tabHistory.length - 1;
        }
        var tab_id = Service.tabHistory[Service.tabHistoryIndex];
        chrome.tabs.update(tab_id, {
            active: true
        });
    }
};
Service.nextTab = function(message, sender, sendResponse) {
    var tab = sender.tab;
    chrome.tabs.query({
        windowId: tab.windowId
    }, function(tabs) {
        chrome.tabs.update(tabs[(((tab.index + 1) % tabs.length) + tabs.length) % tabs.length].id, {
            active: true
        });
    });
};
Service.previousTab = function(message, sender, sendResponse) {
    var tab = sender.tab;
    chrome.tabs.query({
        windowId: tab.windowId
    }, function(tabs) {
        return chrome.tabs.update(tabs[(((tab.index - 1) % tabs.length) + tabs.length) % tabs.length].id, {
            active: true
        });
    });
};
Service.reloadTab = function(message, sender, sendResponse) {
    chrome.tabs.reload({
        bypassCache: message.nocache
    });
};
Service.closeTab = function(message, sender, sendResponse) {
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
Service.openLast = function(message, sender, sendResponse) {
    for (var i = 0; i < message.repeats; i++) {
        chrome.sessions.restore();
    }
};
Service.duplicateTab = function(message, sender, sendResponse) {
    for (var i = 0; i < message.repeats; i++) {
        chrome.tabs.duplicate(sender.tab.id);
    }
};
Service.getBookmarks = function(message, sender, sendResponse) {
    if (message.parentId) {
        chrome.bookmarks.getSubTree(message.parentId, function(tree) {
            var bookmarks = tree[0].children;
            if (message.query && message.query.length) {
                bookmarks = bookmarks.filter(function(b) {
                    return b.title.indexOf(message.query) !== -1 || (b.url && b.url.indexOf(message.query) !== -1);
                });
            }
            sendResponse({
                type: message.action,
                id: message.id,
                bookmarks: bookmarks
            });
        });
    } else {
        if (message.query && message.query.length) {
            chrome.bookmarks.search(message.query, function(tree) {
                sendResponse({
                    type: message.action,
                    id: message.id,
                    bookmarks: tree
                });
            });
        } else {
            chrome.bookmarks.getTree(function(tree) {
                sendResponse({
                    type: message.action,
                    id: message.id,
                    bookmarks: tree[0].children
                });
            });
        }
    }
};
Service.getHistory = function(message, sender, sendResponse) {
    chrome.history.search(message.query, function(tree) {
        sendResponse({
            type: message.action,
            id: message.id,
            history: tree
        });
    });
};
Service.getURLs = function(message, sender, sendResponse) {
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
                    type: message.action,
                    id: message.id,
                    urls: tree.concat(bookmarks)
                });
            });
        } else {
            sendResponse({
                type: message.action,
                id: message.id,
                urls: bookmarks
            });
        }
    });
};
Service.openLink = function(message, sender, sendResponse) {
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
Service.viewSource = function(message, sender, sendResponse) {
    message.url = 'view-source:' + sender.tab.url;
    Service.openLink(message, sender, sendResponse);
};
Service.getSettings = function(message, sender, sendResponse) {
    sendResponse({
        type: message.action,
        settings: Service.settings
    });
};
Service.editSettings = function(message, sender, sendResponse) {
    message.url = chrome.extension.getURL('/pages/options.html');
    Service.openLink(message, sender, sendResponse);
};
Service.updateSettings = function(message, sender, sendResponse) {
    extendSettings(message.settings);
    Service._updateSettings();
};
Service.changeSettingsStorage = function(message, sender, sendResponse) {
    Service.settings.storage = message.storage;
    chrome.storage.local.set(Service.settings);
    if (Service.settings.storage === 'sync') {
        chrome.storage.sync.set(Service.settings, function() {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError);
            }
        });
    }
};
Service.setSurfingkeysIcon = function(message, sender, sendResponse) {
    chrome.browserAction.setIcon({
        path: (message.status ? 'icons/48-x.png' : 'icons/48.png'),
        tabId: sender.tab.id
    });
};
Service.request = function(message, sender, sendResponse) {
    var s = request(message.method, message.url);
    s.then(function(res) {
        sendResponse({
            type: message.action,
            id: message.id,
            text: res
        });
    });
};
Service.nextFrame = function(message, sender, sendResponse) {
    var tid = sender.tab.id;
    chrome.tabs.executeScript(tid, { code: "prepareFrames()" }, function(results){
        var frames = results[0];
        if (!Service.frames.hasOwnProperty(tid)) {
            Service.frames[tid] = 0;
        }
        Service.frames[tid]++;
        Service.frames[tid] = Service.frames[tid] % frames.length;
        chrome.tabs.sendMessage(tid, {
            subject: "focusFrame",
            target: 'content_runtime',
            frameId: frames[Service.frames[tid]]
        });
    });
};
Service.moveTab = function(message, sender, sendResponse) {
    var newPos = parseInt(message.position);
    var activeTabId = sender.tab.id;
    if (newPos > -1 && newPos < 10) {
        chrome.tabs.move(activeTabId, {index: newPos});
    }
};
Service.quit = function(message, sender, sendResponse) {
    chrome.windows.getAll({
        populate: false
    }, function(windows) {
        windows.forEach(function(w) {
            chrome.windows.remove(w.id);
        });
    });
};
Service.createSession = function(message, sender, sendResponse) {
    Service.settings.sessions[message.name] = {'tabs':[]};
    chrome.tabs.query({
        currentWindow: true
    }, function(tabs) {
        tabs.forEach(function(tab) {
            if (tab && tab.index !== void 0) {
                Service.settings.sessions[message.name]['tabs'].push(tab.url);
            }
        });
        chrome.storage.local.set({
            sessions: Service.settings.sessions
        });
    });
};
Service.getSessions = function(message, sender, sendResponse) {
    sendResponse({
        type: message.action,
        id: message.id,
        sessions: Service.settings.sessions
    });
};
Service.openSession = function(message, sender, sendResponse) {
    if (Service.settings.sessions.hasOwnProperty(message.name)) {
        var urls = Service.settings.sessions[message.name]['tabs'];
        urls.forEach(function(url) {
            chrome.tabs.create({
                url: url,
                active: false,
                pinned: false
            });
        });
    }
};
Service.deleteSession = function(message, sender, sendResponse) {
    delete Service.settings.sessions[message.name];
    chrome.storage.local.set({
        sessions: Service.settings.sessions
    });
};

function handleMessage(_message, _sender, _sendResponse, _port) {
    if (_message.target !== 'content_runtime') {
        if (Service.hasOwnProperty(_message.action)) {
            _message.repeats = _message.repeats || 1;
            Service[_message.action](_message, _sender, _sendResponse);
        } else {
            var type = _port ? "[unexpected port message] " : "[unexpected runtime message] ";
            console.log(type + JSON.stringify(_message))
        }
    }
}
chrome.runtime.onMessage.addListener(handleMessage);
chrome.extension.onConnect.addListener(function(port) {
    Service.activePorts.push(port);
    port.postMessage({
        type: 'connected',
        settings: Service.settings,
        extension_id: chrome.i18n.getMessage("@@extension_id")
    });
    port.onMessage.addListener(function(message) {
        return handleMessage(message, port.sender, port.postMessage.bind(port), port);
    });
    port.onDisconnect.addListener(function() {
        for (var i = 0; i < Service.activePorts.length; i++) {
            if (Service.activePorts[i] === port) {
                Service.activePorts.splice(i, 1);
                break;
            }
        }
    });
});

function unRegisterFrame(tabId) {
    if (Service.frames.hasOwnProperty(tabId)) {
        delete Service.frames[tabId];
    }
}
function removeTab(tabId) {
    unRegisterFrame(tabId);
    Service.tabHistory = Service.tabHistory.filter(function(e){
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
    if (!Service.historyTabAction && activeInfo.tabId != Service.tabHistory[Service.tabHistory.length - 1]) {
        if (Service.tabHistory.length > 10) {
            Service.tabHistory.shift();
        }
        if (Service.tabHistoryIndex != Service.tabHistory.length - 1) {
            Service.tabHistory.splice(Service.tabHistoryIndex + 1, Service.tabHistory.length - 1);
        }
        Service.tabHistory.push(activeInfo.tabId);
        Service.tabHistoryIndex = Service.tabHistory.length -1;
    }
    Service.historyTabAction = false;
});
