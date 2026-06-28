String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{' + i + '\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

var disableAll = document.getElementById('disableAll'),
    addToBlocklist = document.getElementById('addToBlocklist'),
    editBlocklist = document.getElementById('editBlocklist'),
    version = "Surfingkeys " + chrome.runtime.getManifest().version;

function RUNTIME(action, args, callback) {
    (args = args || {}).action = action;
    args.needResponse = callback !== undefined;
    chrome.runtime.sendMessage(args, callback);
}

function updateStatus(blocklist) {
    var disabled = blocklist.hasOwnProperty('.*');
    disableAll.textContent = (disabled ? 'Enable ' : 'Disable ') + version;
    RUNTIME('setSurfingkeysIcon', {
        status: disabled
    });
}

function updateSiteStatus(blocklist) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            try {
                var origin = new URL(tabs[0].url).origin;
                var isBlocked = _matchBlocklist(blocklist, new URL(tabs[0].url));
                addToBlocklist.textContent = isBlocked ? 'Enable for this site' : 'Disable for this site';
                addToBlocklist.dataset.url = tabs[0].url;
                addToBlocklist.dataset.origin = origin;
            } catch (e) {
                addToBlocklist.textContent = 'Disable for this site';
            }
        }
    });
}

function _matchBlocklist(blocklist, url) {
    var hrefNoQuery = url.origin + url.pathname;
    for (var pattern in blocklist) {
        if (pattern.indexOf('*') !== -1) {
            var regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            if (regex.test(hrefNoQuery) || regex.test(url.origin)) {
                return true;
            }
        } else if (hrefNoQuery === pattern || url.origin === pattern) {
            return true;
        } else if (hrefNoQuery.indexOf(pattern) === 0) {
            return true;
        }
    }
    return false;
}

RUNTIME('getSettings', {
    key: 'blocklist'
}, function(response) {
    updateStatus(response.settings.blocklist);
    updateSiteStatus(response.settings.blocklist);
});

disableAll.addEventListener('click', function() {
    RUNTIME('toggleBlocklist', {
        domain: ".*"
    }, function(response) {
        updateStatus(response.blocklist);
        updateSiteStatus(response.blocklist);
    });
});

addToBlocklist.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            try {
                var url = new URL(tabs[0].url);
                var hrefNoQuery = url.origin + url.pathname;
                RUNTIME('getSettings', { key: 'blocklist' }, function(response) {
                    var blocklist = response.settings.blocklist;
                    if (_matchBlocklist(blocklist, url)) {
                        for (var pattern in blocklist) {
                            if (pattern === hrefNoQuery || pattern === url.origin) {
                                delete blocklist[pattern];
                            } else if (pattern.indexOf('*') !== -1) {
                                var regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                                if (regex.test(hrefNoQuery) || regex.test(url.origin)) {
                                    delete blocklist[pattern];
                                }
                            } else if (hrefNoQuery.indexOf(pattern) === 0) {
                                delete blocklist[pattern];
                            }
                        }
                    } else {
                        blocklist[hrefNoQuery] = 1;
                    }
                    RUNTIME('updateSettings', {
                        settings: { blocklist: blocklist }
                    }, function() {
                        updateStatus(blocklist);
                        updateSiteStatus(blocklist);
                    });
                });
            } catch (e) {}
        }
    });
});

document.getElementById('reportIssue').addEventListener('click', function () {
    window.close();
    var description = "%23%23+Error+details%0A%0A{0}%0A%0ASurfingKeys%3A+{1}%0A%0ABrowser%3A+{2}%0A%0AURL%3A+{3}%0A%0A%23%23+Context%0A%0A%2A%2APlease+replace+this+with+a+description+of+how+you+were+using+SurfingKeys.%2A%2A".format(encodeURIComponent(""), chrome.runtime.getManifest().version, encodeURIComponent(navigator.userAgent), encodeURIComponent("<The_URL_Where_You_Find_The_Issue>"));
    window.open("https://github.com/brookhong/Surfingkeys/issues/new?title={0}&body={1}".format(encodeURIComponent(""), description));
});
