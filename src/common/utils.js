function LOG(level, msg) {
    // To turn on all levels: chrome.storage.local.set({"logLevels": ["log", "warn", "error"]})
    chrome.storage.local.get(["logLevels"], (r) => {
        const logLevels = r && r.logLevels || ["error"];
        if (["log", "warn", "error"].indexOf(level) !== -1 && logLevels.indexOf(level) !== -1) {
            console[level](msg);
        }
    });
}

function regexFromString(str, caseSensitive, highlight) {
    var rxp = null;
    const flags = caseSensitive ? "" : "i";
    str = str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
    if (highlight) {
        rxp = new RegExp(str.replace(/\s+/, "\|"), flags);
    } else {
        var words = str.split(/\s+/).map(function(w) {
            return `(?=.*${w})`;
        }).join('');
        rxp = new RegExp(`^${words}.*$`, flags);
    }
    return rxp;
}

function filterByTitleOrUrl(urls, query, caseSensitive) {
    if (query && query.length) {
        var rxp = regexFromString(query, caseSensitive, false);
        urls = urls.filter(function(b) {
            return rxp.test(b.title) || rxp.test(b.url);
        });
    }
    return urls;
}

// `settings.localPath` set to this reads the snippets from ~/.surfingkeys.js through
// the native app instead of fetching a URL. Shared because the options page must
// pass it to the background untouched, while it rewrites every other value into a
// URL.
const NATIVE_LOCAL_PATH = "<native>";

// The name every native message is addressed to. On Chrome and Firefox it must equal
// the "name" in the host manifest (src/nvim/server/Readme.md); Safari ignores it and
// routes to its containing app, so a wrong name is only noticed off Safari.
const NATIVE_HOST_NAME = "surfingkeys";

export {
    LOG,
    NATIVE_HOST_NAME,
    NATIVE_LOCAL_PATH,
    filterByTitleOrUrl,
    regexFromString,
}
