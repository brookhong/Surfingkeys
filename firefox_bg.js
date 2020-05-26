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
    if (!proxyConf.proxyMode || proxyConf.proxyMode === 'clear') {
        browser.proxy.unregister();
    } else {
        var autoproxy_pattern = proxyConf.autoproxy_hosts.map(function(h) {
            return h.filter(function(a) {
                return a.indexOf('*') !== -1;
            }).join('|');
        });
        var autoproxy_hosts = proxyConf.autoproxy_hosts.map(function(h) {
            return dictFromArray(h.filter(function(a) {
                return a.indexOf('*') === -1;
            }), 1);
        });
        browser.proxy.register("firefox_pac.js");
        var pacv = {
            hosts: autoproxy_hosts,
            autoproxy_pattern: autoproxy_pattern,
            proxyMode: proxyConf.proxyMode,
            proxy: proxyConf.proxy
        };
        browser.runtime.sendMessage(pacv, {toProxyScript: true});
    }
}

browser.proxy.onError.addListener(error => {
    console.error(`Proxy error: ${error.message}`);
});
