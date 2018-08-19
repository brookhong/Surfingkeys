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

function readLocalFile(path, cb) {
    fetch(path, {mode:'same-origin'})
        .then(function(res) {
            return res.blob();
        })
        .then(function(blob) {
            var reader = new FileReader();

            reader.addEventListener("loadend", function() {
                cb(this.result);
            });

            reader.readAsText(blob);
        });
}

function request(url, onReady, headers, data, onException) {
    if (/^file:\/\/\//.test(url)) {
        return readLocalFile(url, onReady);
    }
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

browser.proxy.onProxyError.addListener(error => {
    console.error(`Proxy error: ${error.message}`);
});
