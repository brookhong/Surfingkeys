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
        var autoproxy_pattern = proxyConf.autoproxy_hosts.filter(function(a) {
            return a.indexOf('*') !== -1;
        }).join('|');
        var config = {
            mode: (["always", "byhost", "bypass"].indexOf(proxyConf.proxyMode) !== -1) ? "pac_script" : proxyConf.proxyMode,
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
                        var gates = [pacGlobal.proxy, "DIRECT"];
                        if (pacGlobal.proxyMode === "bypass") {
                            gates = ["DIRECT", pacGlobal.proxy];
                        }
                        var pp = new RegExp(pacGlobal.autoproxy_pattern);
                        do {
                            if (pacGlobal.hosts.hasOwnProperty(host)) {
                                return gates[0];
                            }
                            if (pacGlobal.autoproxy_pattern.length && pp.test(host)) {
                                return gates[0];
                            }
                            lastPos = host.indexOf('.') + 1;
                            host = host.slice(lastPos);
                        } while (lastPos >= 1);
                        return gates[1];
                    }`
            }
        };
        chrome.proxy.settings.set( {value: config, scope: 'regular'}, function() {
        });
    }
}

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
