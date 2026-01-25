import {
    extendObject,
    getSubSettings,
    start
} from './start.js';

function loadRawSettings(keys, cb, defaultSet) {
    var rawSet = defaultSet || {};
    chrome.storage.local.get(null, function(localSet) {
        var localSavedAt = localSet.savedAt || 0;
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
    _applyProxySettings,
    _setNewTabUrl,
    _getContainerName
});
