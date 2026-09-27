import { RUNTIME, dispatchSKEvent, runtime, skChannelScope, skEventName } from './common/runtime.js';
import Mode from './common/mode.js';
import createNormal from './common/normal.js';
import startScrollNodeObserver from './common/observer.js';
import createInsert from './common/insert.js';
import createVisual from './common/visual.js';
import createHints from './common/hints.js';
import createClipboard from './common/clipboard.js';
import {
    applyUserSettings,
    createElementWithContent,
    generateQuickGuid,
    getBrowserName,
    getRealEdit,
    htmlEncode,
    initL10n,
    isInUIFrame,
    reportIssue,
    setSanitizedContent,
    showBanner,
} from './common/utils.js';
import createFront from './front.js';
import createAPI from './common/api.js';
import createDefaultMappings from './common/default.js';

import KeyboardUtils from './common/keyboardUtils';

/*
 * Apply custom key mappings for basic users, the input is like
 * {"a": "b", "b": "a", "c": "d"}
 */
function applyBasicMappings(api, normal, mappings) {
    const originKeys = new Set(Object.keys(mappings));
    const originMappings = {};
    for (const originKey in mappings) {
        const newKey = mappings[originKey];
        // current new key is one original key that will be overrode later
        // we need save it some where first, since current map will lose it,
        // such as the `a` in above example.
        if (originKeys.has(newKey)) {
            const target = normal.mappings.find(newKey);
            if (target) {
                originMappings[newKey] = target.meta;
            }
        }
        if (newKey === "") {
            normal.mappings.remove(originKey);
        } else if (originMappings.hasOwnProperty(originKey)) {
            normal.mappings.add(newKey, originMappings[originKey]);
        } else {
            api.map(newKey, originKey);
        }
    }
}

function ensureRegex(regexName) {
    const r = runtime.conf[regexName]
    if (r && r.source && !(r instanceof RegExp)) {
        runtime.conf[regexName] = new RegExp(r.source, r.flags);
    }
}

function applyRuntimeConf(normal) {
    ensureRegex("prevLinkRegex");
    ensureRegex("nextLinkRegex");
    ensureRegex("clickablePat");
    ensureRegex("textAnchorPat");
    RUNTIME('getState', {
        blocklistPattern: runtime.conf.blocklistPattern ? runtime.conf.blocklistPattern : undefined,
        lurkingPattern: runtime.conf.lurkingPattern ? runtime.conf.lurkingPattern : undefined
    }, function (resp) {
        let state = resp.state;
        if (state === "disabled") {
            normal.disable();
            dispatchSKEvent("front", ['showStatus', [undefined, undefined, undefined, ""]]);
        } else if (state === "lurking") {
            state = normal.startLurk();
        } else {
            if (document.contentType === "application/pdf" && !resp.noPdfViewer) {
                _browser.usePdfViewer();
            } else {
                normal.enable();
            }
            Mode.showStatus();
        }

        if (window === top) {
            RUNTIME('setSurfingkeysIcon', {
                status: state
            });
            var proxyMode = "";
            if (state === "enabled" && runtime.conf.showProxyInStatusBar && resp.proxyMode) {
                proxyMode = resp.proxyMode;
                if (["byhost", "always"].indexOf(resp.proxyMode) !== -1) {
                    proxyMode = "{0}: {1}".format(resp.proxyMode, resp.proxy);
                }
            }
            dispatchSKEvent("front", ['showStatus', [undefined, undefined, undefined, proxyMode]]);
        }
    });
}

const userConfPromise = new Promise(function (resolve, reject) {
    document.addEventListener(skEventName("settingsFromSnippetsLoaded"), () => {
        resolve(runtime.conf);
    }, {once: true});
});

function applySettings(api, normal, rs) {
    for (var k in rs) {
        if (runtime.conf.hasOwnProperty(k)) {
            runtime.conf[k] = rs[k];
        }
    }
    if ('findHistory' in rs) {
        runtime.conf.lastQuery = rs.findHistory.length ? rs.findHistory[0] : "";
    }
    if (!rs.showAdvanced) {
        if (rs.basicMappings) {
            applyBasicMappings(api, normal, rs.basicMappings);
        }
        if (rs.disabledSearchAliases) {
            for (const key in rs.disabledSearchAliases) {
                api.removeSearchAlias(key);
            }
        }
    } else if (!rs.isMV3 && rs.snippets && !document.location.href.startsWith(chrome.runtime.getURL("/"))) {
        var settings = {}, error = "";
        try {
            (new Function('settings', 'api', rs.snippets))(settings, api);
        } catch (e) {
            error = e.toString();
        }
        applyUserSettings({settings, error});
    }

    applyRuntimeConf(normal);
    document.addEventListener(skEventName("settingsFromSnippetsLoaded"), () => {
        applyRuntimeConf(normal);
    }, {once: true});
}

function _initModules() {
    const clipboard = createClipboard();
    const insert = createInsert();
    const normal = createNormal(insert);
    normal.enter();
    startScrollNodeObserver(normal);
    const hints = createHints(insert, normal, clipboard);
    const visual = createVisual(clipboard, hints);
    const front = createFront(insert, normal, hints, visual, _browser);

    const api = createAPI(clipboard, insert, normal, hints, visual, front, _browser);
    createDefaultMappings(api, clipboard, insert, normal, hints, visual, front, _browser);
    if (typeof(_browser.plugin) === "function") {
        _browser.plugin({ front });
    }

    dispatchSKEvent('defaultSettingsLoaded', {normal, api});
    RUNTIME('getSettings', null, function(response) {
        var rs = response.settings;
        applySettings(api, normal, rs);
        const disabledSearchAliases = rs.disabledSearchAliases;
        const getUsage = front.getUsage;
        const frontCommand = front.command;
        dispatchSKEvent('userSettingsLoaded', {settings: rs, disabledSearchAliases, getUsage, frontCommand});
        settingsApplied = true;
        maybeStartUserScript();
    });
    return {
        normal,
        front,
        api,
    };
}


function _initContent(modes) {
    window.frameId = generateQuickGuid();
    runtime.on('settingsUpdated', response => {
        var rs = response.settings;
        applySettings(modes.api, modes.normal, rs);
    });

    if (runtime.conf.stealFocusOnLoad && !isInUIFrame()
        && document.body && document.body.childElementCount > 1) {
        var elm = getRealEdit();
        elm && elm.blur();
    }
}

window.getFrameId = function () {
    if (!window.frameId && window.innerWidth > 16 && window.innerHeight > 16
        && document.body && document.body.childElementCount > 0
        && runtime.conf.ignoredFrameHosts.indexOf(window.origin) === -1
        && (!window.frameElement || (parseInt("0" + getComputedStyle(window.frameElement).zIndex) >= 0
            && window.frameElement.offsetWidth > 16 && window.frameElement.offsetWidth > 16))
    ) {
        _initContent(_initModules());
    }
    return window.frameId;
};

/*
 * Starting the user script holding a Chrome MV3 user's snippets. It runs in this
 * same document but in a JS world of its own, reaching this one only over the
 * DOM-event channels, and only once it has the scope those are named after.
 *
 * So each side waits for the other, in whichever order they happen: announcing
 * readiness rather than starting the snippets on a timer is what keeps a slow scope
 * round trip from dropping them silently, and waiting for the settings keeps this
 * frame's stored values from landing on top of what the snippets just set.
 */
let userScriptListening = false, settingsApplied = false, userScriptStarted = false;
function maybeStartUserScript() {
    if (userScriptListening && settingsApplied && !userScriptStarted) {
        userScriptStarted = true;
        dispatchSKEvent('user', ["runUserScript"]);
    }
}
document.addEventListener(skEventName("userScriptListening"), () => {
    userScriptListening = true;
    maybeStartUserScript();
});
// Answered from whichever frame the user script asked in, so it is registered here
// at load rather than with the modes: a frame's modes only boot on first focus or
// keystroke, and the scope is the same either way. Registering it makes this frame a
// receiving end for background messages, hence only where a user script exists to
// ask -- the chromium build, the only one that registers one.
if (chrome.runtime.getManifest().manifest_version === 3) {
    runtime.on('getChannelScope', function(msg, sender, response) {
        // Synchronous: runtime.js's listener does not hold the channel open.
        response({scope: skChannelScope()});
    });
}

Mode.init(window === top ? undefined : ()=> {
    window.addEventListener("focus", () => {
        getFrameId();
    }, {once: true});
});

let _browser;
function start(browser) {
    _browser = browser || {
        usePdfViewer: () => {},
        readText: () => {},
    };
    if (window === top) {
        new Promise((r, j) => {
            if (window.location.href === chrome.runtime.getURL("/pages/options.html")) {
                import(/* webpackIgnore: true */ './pages/options.js').then((optionsLib) => {
                    optionsLib.default(
                        RUNTIME,
                        KeyboardUtils,
                        Mode,
                        createElementWithContent,
                        getBrowserName,
                        htmlEncode,
                        initL10n,
                        reportIssue,
                        setSanitizedContent,
                        showBanner);
                    r(_initModules());
                });
            } else {
                r(_initModules());
            }
        }).then((modes) => {
            _initContent(modes);
            runtime.on('titleChanged', function() {
                Mode.checkEventListener(() => {
                    modes.front.detach();
                    modes = _initModules();
                    _initContent(modes);
                    modes.front.attach();
                });
            });
            runtime.on('tabActivated', function() {
                modes.front.attach();
            });
            runtime.on('tabDeactivated', function() {
                modes.front.detach();
            });
            runtime.on('setScrollPos', function(msg, sender, response) {
                setTimeout(() => {
                    document.scrollingElement.scrollLeft = msg.scrollLeft;
                    document.scrollingElement.scrollTop = msg.scrollTop;
                }, 1000);
            });
            runtime.on('showBanner', function(msg, sender, response) {
                showBanner(msg.message, 3000);
            });
            document.addEventListener(skEventName("ensureFrontEnd"), function(evt) {
                modes.front.attach();
            });

            RUNTIME('tabURLAccessed', {
                title: document.title,
                url: window.location.href
            }, function (resp) {

                if (resp.index > 0) {
                    var showTabIndexInTitle = function () {
                        skipObserver = true;
                        userConfPromise.then(function(conf) {
                            document.title = myTabIndex + conf.tabIndicesSeparator + originalTitle;
                        });
                    };

                    var myTabIndex = resp.index,
                        skipObserver = false,
                        originalTitle = document.title;

                    new MutationObserver(function (mutationsList) {
                        if (skipObserver) {
                            skipObserver = false;
                        } else {
                            originalTitle = document.title;
                            showTabIndexInTitle();
                        }
                    }).observe(document.querySelector("title"), { childList: true });;

                    showTabIndexInTitle();

                    runtime.on('tabIndexChange', function(msg, sender, response) {
                        if (msg.index !== myTabIndex) {
                            myTabIndex = msg.index;
                            showTabIndexInTitle();
                        }
                    });
                }
            });

        });
    } else {
        document.addEventListener(skEventName("iframeBoot"), () => {
            _initContent(_initModules());
        }, {once: true});
    }
}

export { start };
