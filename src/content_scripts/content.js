import { RUNTIME, dispatchSKEvent, runtime } from './common/runtime.js';
import Mode from './common/mode.js';
import createNormal from './common/normal.js';
import startScrollNodeObserver from './common/observer.js';
import createInsert from './common/insert.js';
import createVisual from './common/visual.js';
import createHints from './common/hints.js';
import createClipboard from './common/clipboard.js';
import {
    generateQuickGuid,
    getRealEdit,
    isInUIFrame,
    showPopup,

    createElementWithContent,
    getBrowserName,
    htmlEncode,
    initL10n,
    reportIssue,
    setSanitizedContent,
    showBanner,
} from './common/utils.js';
import createFront from './front.js';
import createAPI from './common/api.js';
import createDefaultMappings from './common/default.js';

import KeyboardUtils from './common/keyboardUtils';

/*
 * run user snippets, and return settings updated in snippets
 */
function runScript(api, snippets) {
    var result = { settings: {}, error: "" };
    try {
        var F = new Function('settings', 'api', snippets);
        F(result.settings, api);
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

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

function isEmptyObject(obj) {
    for (var name in obj) {
        return false;
    }
    return true;
}

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
    }
    if (rs.showAdvanced && 'snippets' in rs && rs.snippets && !isInUIFrame()) {
        var delta = runScript(api, rs.snippets);
        if (delta.error !== "") {
            if (window === top) {
                showPopup("[SurfingKeys] Error found in settings: " + delta.error);
            } else {
                console.log("[SurfingKeys] Error found in settings({0}): {1}".format(window.location.href, delta.error));
            }
        }
        if (!isEmptyObject(delta.settings)) {
            dispatchSKEvent('setUserSettings', JSON.parse(JSON.stringify(delta.settings)));
            // overrides local settings from snippets
            for (var k in delta.settings) {
                if (runtime.conf.hasOwnProperty(k)) {
                    runtime.conf[k] = delta.settings[k];
                    delete delta.settings[k];
                }
            }
            if (Object.keys(delta.settings).length > 0 && window === top) {
                // left settings are for background, need not broadcast the update, neither persist into storage
                RUNTIME('updateSettings', {
                    scope: "snippets",
                    settings: delta.settings
                });
            }
        }
    }
    if (runtime.conf.showProxyInStatusBar && 'proxyMode' in rs) {
        var proxyMode = rs.proxyMode;
        if (["byhost", "always"].indexOf(rs.proxyMode) !== -1) {
            proxyMode = "{0}: {1}".format(rs.proxyMode, rs.proxy);
        }
        dispatchSKEvent('showStatus', [[undefined, undefined, undefined, proxyMode]]);
    }

    RUNTIME('getState', {
        blocklistPattern: runtime.conf.blocklistPattern ? runtime.conf.blocklistPattern.toJSON() : undefined,
        lurkingPattern: runtime.conf.lurkingPattern ? runtime.conf.lurkingPattern.toJSON() : undefined
    }, function (resp) {
        let state = resp.state;
        if (state === "disabled") {
            normal.disable();
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
        }
    });
}

function _initModules() {
    const clipboard = createClipboard();
    const insert = createInsert();
    const normal = createNormal(insert);
    normal.enter();
    startScrollNodeObserver(normal);
    const hints = createHints(insert, normal);
    const visual = createVisual(clipboard, hints);
    const front = createFront(insert, normal, hints, visual, _browser);

    const api = createAPI(clipboard, insert, normal, hints, visual, front, _browser);
    createDefaultMappings(api);
    if (typeof(_browser.plugin) === "function") {
        _browser.plugin({ front });
    }

    dispatchSKEvent('defaultSettingsLoaded', {normal, api});
    RUNTIME('getSettings', null, function(response) {
        var rs = response.settings;
        applySettings(api, normal, rs);
        dispatchSKEvent('userSettingsLoaded', {settings: rs, api, front});
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
            if (window.location.href === chrome.extension.getURL("/pages/options.html")) {
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
            document.addEventListener("surfingkeys:ensureFrontEnd", function(evt) {
                modes.front.attach();
            });
            window._setScrollPos = function (x, y) {
                document.scrollingElement.scrollLeft = x;
                document.scrollingElement.scrollTop = y;
            };

            RUNTIME('tabURLAccessed', {
                title: document.title,
                url: window.location.href
            }, function (resp) {

                if (resp.index > 0) {
                    var showTabIndexInTitle = function () {
                        skipObserver = true;
                        document.title = myTabIndex + " " + originalTitle;
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
        document.addEventListener("surfingkeys:iframeBoot", () => {
            _initContent(_initModules());
        }, {once: true});
    }
}

export { start };
