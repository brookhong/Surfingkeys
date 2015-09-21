chrome.commands.onCommand.addListener(function(command) {
    switch (command) {
        case 'restartext':
            chrome.runtime.reload();
            break;
        default:
            break;
    }
});

var initialSettings = {
    'maxResults': 500,
    'blacklist': {},
    'marks': {},
    'version': chrome.runtime.getManifest().version,
    'storage': 'local'
};

var Service = {
    'activePorts': [],
    'frames': {},
    'settings': ""
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
chrome.storage.local.get(null, function(data) {
    if (!data.version) {
        chrome.storage.local.clear();
        chrome.storage.sync.clear();
        Service.settings = JSON.parse(JSON.stringify(initialSettings));
        var s = request('get', chrome.extension.getURL('/pages/default.js'));
        s.then(function(resp) {
            Service.settings.snippets = resp;
        });
    } else {
        Service.settings = data;
        if (data.storage === 'sync') {
            chrome.storage.sync.get(null, function(data) {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError);
                } else {
                    Service.settings = data;
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
Service.loadSettingsFromUrl = function(url) {
    var s = request('get', url);
    s.then(function(resp) {
        Service.settings.snippets = resp;
        Service._updateSettings();
    });
};
Service.resetSettings = function(message, sender, sendResponse) {
    Service.loadSettingsFromUrl(chrome.extension.getURL('/pages/default.js'));
};
Service.getTabs = function(message, sender, sendResponse) {
    var tab = sender.tab;
    chrome.tabs.query({
        windowId: tab.windowId
    }, function(tabs) {
        sendResponse({
            type: message.action,
            tabs: tabs
        });
    });
};
Service.focusTab = function(message, sender, sendResponse) {
    chrome.tabs.update(message.tab_id, {
        active: true
    });
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
                bookmarks: bookmarks
            });
        });
    } else {
        if (message.query && message.query.length) {
            chrome.bookmarks.search(message.query, function(tree) {
                sendResponse({
                    type: message.action,
                    bookmarks: tree
                });
            });
        } else {
            chrome.bookmarks.getTree(function(tree) {
                sendResponse({
                    type: message.action,
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
                'text': message.query,
                startTime: 0,
                maxResults: vacancy
            }, function(tree) {
                sendResponse({
                    type: message.action,
                    urls: tree.concat(bookmarks)
                });
            });
        } else {
            sendResponse({
                type: message.action,
                urls: bookmarks
            });
        }
    });
};
Service.openLink = function(message, sender, sendResponse) {
    if (message.tab.tabbed) {
        for (var i = 0; i < message.repeats; ++i) {
            chrome.tabs.create({
                url: message.url,
                active: message.tab.active,
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
    for (var sd in message.settings) {
        Service.settings[sd] = message.settings[sd];
    }
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
    if (Service.frames.hasOwnProperty(tid)) {
        var frameData = Service.frames[tid];
        frameData[0] = (frameData[0] + 1) % frameData[1].length;
        chrome.tabs.sendMessage(tid, {
            subject: "focusFrame",
            frameId: frameData[1][frameData[0]]
        });
    }
};
Service.registerFrame = function(message, sender, sendResponse) {
    var tid = sender.tab.id;
    if (!Service.frames.hasOwnProperty(tid)) {
        Service.frames[tid] = [0, []];
    }
    Service.frames[tid][1].push(message.frameId);
};
Service.unRegisterFrame = function(message, sender, sendResponse) {
    unRegisterFrame(sender.tab.id);
};

function handleMessage(_message, _sender, _sendResponse, _port) {
    if (Service.hasOwnProperty(_message.action)) {
        _message.repeats = _message.repeats || 1;
        Service[_message.action](_message, _sender, _sendResponse);
    } else {
        var type = _port ? "[unexpected port message] " : "[unexpected runtime message] ";
        console.log(type + JSON.stringify(_message))
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
chrome.tabs.onRemoved.addListener(unRegisterFrame);
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === "loading") {
        unRegisterFrame(tabId);
    }
});
