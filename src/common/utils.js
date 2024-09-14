function LOG(level, msg) {
    // To turn on all levels: chrome.storage.local.set({"logLevels": ["log", "warn", "error"]})
    chrome.storage.local.get(["logLevels"], (r) => {
        const logLevels = r && r.logLevels || ["error"];
        if (["log", "warn", "error"].indexOf(level) !== -1 && logLevels.indexOf(level) !== -1) {
            console[level](msg);
        }
    });
}

function regexFromString(str, highlight) {
    var rxp = null;
    if (/^\/.+\/([gimuy]*)$/.test(str)) {
        // full regex input
        try {
            rxp = eval(str);
        } catch (e) {
            rxp = null;
        }
    }
    if (!rxp) {
        if (/^\/.+$/.test(str)) {
            // part regex input
            rxp = eval(str + "/i");
        }
        if (!rxp) {
            str = str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
            if (highlight) {
                rxp = new RegExp(str.replace(/\s+/, "\|"), 'gi');
            } else {
                var words = str.split(/\s+/).map(function(w) {
                    return `(?=.*${w})`;
                }).join('');
                rxp = new RegExp(`^${words}.*$`, "gi");
            }
        }
    }
    return rxp;
}

function filterByTitleOrUrl(urls, query) {
    if (query && query.length) {
        var rxp = regexFromString(query, false);
        urls = urls.filter(function(b) {
            return rxp.test(b.title) || rxp.test(b.url);
        });
    }
    return urls;
}

export {
    LOG,
    filterByTitleOrUrl,
    regexFromString,
}
