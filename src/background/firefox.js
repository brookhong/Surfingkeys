import {
    extendObject,
    getSubSettings,
    start
} from './start.js';

function normalizeSettingsPath(path) {
    path = path || "";
    if (path.length && !/^\w+:\/\/\w+/i.test(path) && path.indexOf('file:///') === -1) {
        path = path.replace(/\\/g, '/');
        if (path[0] === '/') {
            path = path.substr(1);
        }
        path = "file:///" + path;
    }
    return path;
}

// Keep Firefox managed settings intentionally small:
// - snippets: inline JS config
// - localPath: URL or filesystem path to fetch JS config from
function normalizeManagedSettings(rawManagedSettings) {
    if (!rawManagedSettings || typeof(rawManagedSettings) !== "object") {
        return null;
    }

    var managedSet = {};

    if (typeof(rawManagedSettings.snippets) === "string") {
        managedSet.snippets = rawManagedSettings.snippets;
    }

    if (typeof(rawManagedSettings.localPath) === "string") {
        managedSet.localPath = normalizeSettingsPath(rawManagedSettings.localPath.trim());
    }

    if (!managedSet.hasOwnProperty("snippets") && !managedSet.hasOwnProperty("localPath")) {
        return null;
    }

    return managedSet;
}

// Read managed policy values from Firefox enterprise policy storage.
function loadManagedSettings(cb) {
    if (!chrome.storage || !chrome.storage.managed || !chrome.storage.managed.get) {
        cb(null);
        return;
    }

    chrome.storage.managed.get(null, function(rawManagedSettings) {
        if (chrome.runtime.lastError) {
            cb(null);
            return;
        }
        cb(normalizeManagedSettings(rawManagedSettings));
    });
}

function loadRawSettings(keys, cb, defaultSet) {
    var rawSet = defaultSet || {};
    chrome.storage.local.get(null, function(localSet) {
        extendObject(rawSet, localSet);
        var subset = getSubSettings(rawSet, keys);
        if (chrome.runtime.lastError) {
            subset.error = "Settings sync may not work thoroughly because of: " + chrome.runtime.lastError.message;
        }
        cb(subset);
    });
}

function _applyProxySettings(proxyConf) {
}

function _setNewTabUrl(){
    return "about:newtab";
}

function _getContainerName(self, _response) {
    return function (message, sender, sendResponse){
        var cookieStoreId = sender.tab.cookieStoreId;
        browser.contextualIdentities.get(cookieStoreId).then(function(container){
            _response(message, sendResponse, {
                name : container.name
            });
        }, function(err){
            _response(message, sendResponse, {
                name : null
            });});
    };
}

function getLatestHistoryItem(text, maxResults, cb) {
    chrome.history.search({
        startTime: 0,
        text,
        maxResults
    }, function(items) {
        cb(items);
    });
}

start({
    name: "Firefox",
    detectTabTitleChange: true,
    getLatestHistoryItem,
    loadRawSettings,
    loadManagedSettings,
    normalizeSettingsPath,
    _applyProxySettings,
    _setNewTabUrl,
    _getContainerName
});
