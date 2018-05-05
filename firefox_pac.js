var pacGlobal = {};

browser.runtime.onMessage.addListener((message) => {
    pacGlobal = message;
    if (pacGlobal.proxy.toLowerCase().indexOf("socks") === 0) {
        var p = pacGlobal.proxy.split(" ");
        var h = p[1].split(":");
        pacGlobal.proxy = [{
            type: p[0],
            host: h[0],
            port: h[1],
            proxyDNS: true
        }];
    }
});

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
}
