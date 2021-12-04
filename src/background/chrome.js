import {
    _save,
    dictFromArray,
    extendObject,
    getSubSettings,
    start
} from './start.js';

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

function _applyProxySettings(proxyConf) {
    if (!proxyConf.proxyMode || proxyConf.proxyMode === 'clear') {
        chrome.proxy.settings.clear({scope: 'regular'});
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
        var config = {
            mode: (["always", "byhost", "bypass"].indexOf(proxyConf.proxyMode) !== -1) ? "pac_script" : proxyConf.proxyMode,
            pacScript: {
                data: `var pacGlobal = {
                        hosts: ${JSON.stringify(autoproxy_hosts)},
                        autoproxy_pattern: ${JSON.stringify(autoproxy_pattern)},
                        proxyMode: '${proxyConf.proxyMode}',
                        proxy: ${JSON.stringify(proxyConf.proxy)}
                    };
                    function FindProxyForURL(url, host) {
                        var lastPos;
                        if (pacGlobal.proxyMode === "always") {
                            return pacGlobal.proxy[0];
                        } else if (pacGlobal.proxyMode === "bypass") {
                            var pp = new RegExp(pacGlobal.autoproxy_pattern[0]);
                            do {
                                if (pacGlobal.hosts[0].hasOwnProperty(host)
                                    || (pacGlobal.autoproxy_pattern[0].length && pp.test(host))) {
                                    return "DIRECT";
                                }
                                lastPos = host.indexOf('.') + 1;
                                host = host.slice(lastPos);
                            } while (lastPos >= 1);
                            return pacGlobal.proxy[0];
                        } else {
                            for (var i = 0; i < pacGlobal.proxy.length; i++) {
                                var pp = new RegExp(pacGlobal.autoproxy_pattern[i]);
                                var ahost = host;
                                do {
                                    if (pacGlobal.hosts[i].hasOwnProperty(ahost)
                                        || (pacGlobal.autoproxy_pattern[i].length && pp.test(ahost))) {
                                        return pacGlobal.proxy[i];
                                    }
                                    lastPos = ahost.indexOf('.') + 1;
                                    ahost = ahost.slice(lastPos);
                                } while (lastPos >= 1);
                            }
                            return "DIRECT";
                        }
                    }`
            }
        };
        chrome.proxy.settings.set( {value: config, scope: 'regular'}, function() {
        });
    }
}

function _setNewTabUrl(){
    return  "chrome://newtab/";
}

function _getContainerName(self, _response){
}

function getLatestHistoryItem(text, maxResults, cb) {
    const caseSensitive = text.toLowerCase() !== text;
    let endTime = new Date().getTime();
    let results = [];
    const impl = (endTime, maxResults, cb) => {
        const prefetch = maxResults * Math.pow(10, Math.min(2, text.length));
        chrome.history.search({
            startTime: 0,
            endTime,
            text: "",
            maxResults: prefetch
        }, function(items) {
            const filtered = items.filter((item) => {
                const title = caseSensitive ? item.title : item.title.toLowerCase();
                const url = caseSensitive ? item.url : item.url.toLowerCase();
                return title.indexOf(text) !== -1 || url.indexOf(text) !== -1;
            });
            results = [...results, ...filtered];
            if (items.length < maxResults || results.length >= maxResults) {
                // all items are scanned or we have got what we want
                cb(results.slice(0, maxResults));
            } else {
                endTime = items[items.length-1].lastVisitTime - 0.01;
                impl(endTime, maxResults, cb);
            }
        });
    };

    impl(endTime, maxResults, cb);
}

start({
    getLatestHistoryItem,
    loadRawSettings,
    _applyProxySettings,
    _setNewTabUrl,
    _getContainerName
});
