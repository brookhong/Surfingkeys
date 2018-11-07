var pacGlobal = {};

browser.runtime.onMessage.addListener((message) => {
    pacGlobal = message;
    pacGlobal.proxy.forEach(function(proxy, i) {
        if (proxy.toLowerCase().indexOf("socks") === 0) {
            var p = proxy.split(" ");
            var h = p[1].split(":");
            pacGlobal.proxy[i] = [{
                type: p[0],
                host: h[0],
                port: h[1],
                proxyDNS: true
            }];
        }
    });
});

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
}
