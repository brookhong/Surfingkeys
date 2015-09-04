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
    'activePorts': [],
    'topOrigins': {},
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
chrome.storage.local.get('surfingkeys_settings', function(data) {
    if (data.surfingkeys_settings) {
        Service.settings = data.surfingkeys_settings;
    } else {
        var s = request('get', chrome.extension.getURL('/pages/default.js'));
        s.then(function(resp) {
            Service.settings = resp;
        });
    }
});
Service.nextTab = function(message, sender, sendResponse) {
    var tab = sender.tab;
    chrome.tabs.query({
        windowId: tab.windowId
    }, function(tabs) {
        return chrome.tabs.update(tabs[(((tab.index + 1) % tabs.length) + tabs.length) % tabs.length].id, {
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
    chrome.bookmarks.search(message.query, function(tree) {
        sendResponse({
            type: 'bookmarks',
            bookmarks: tree
        });
    });
};
Service.getHistory = function(message, sender, sendResponse) {
    chrome.history.search(message.query, function(tree) {
        sendResponse({
            type: 'history',
            history: tree
        });
    });
};
Service.getURLs = function(message, sender, sendResponse) {
    chrome.history.search({
        'text': message.query,
        startTime: 0,
        maxResults: 2147483647
    }, function(tree) {
        var history = tree;
        chrome.bookmarks.search(message.query, function(tree) {
            sendResponse({
                type: 'urls',
                urls: tree.concat(history)
            });
        });
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
        type: 'settings',
        settings: Service.settings
    });
};
Service.editSettings = function(message, sender, sendResponse) {
    message.url = chrome.extension.getURL('/pages/options.html');
    Service.openLink(message, sender, sendResponse);
};
Service.updateSettings = function(message, sender, sendResponse) {
    chrome.storage.local.set({
        surfingkeys_settings: message.settings
    });
    Service.settings = message.settings;
    Service.activePorts.forEach(function(port) {
        port.postMessage({
            type: 'settingsUpdated',
            settings: Service.settings
        });
    });
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
            type: 'request',
            id: message.id,
            text: res
        });
    });
};
Service.setTopOrigin = function(message, sender, sendResponse) {
    Service.topOrigins[sender.tab.id] = message.topOrigin;
};
Service.getTopOrigin = function(message, sender, sendResponse) {
    sendResponse({
        type: 'topOrigin',
        topOrigin: (sender.tab ? Service.topOrigins[sender.tab.id] : "NONE")
    });
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
