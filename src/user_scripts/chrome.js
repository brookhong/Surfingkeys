import { RUNTIME, dispatchSKEvent } from '../content_scripts/common/runtime.js';
import {
    httpRequest,
    getBrowserName,
    getClickableElements,
    initSKFunctionListener,
    isElementPartiallyInViewport,
    tabOpenLink,
} from '../content_scripts/common/utils.js';

var EXTENSION_ROOT_URL = "";
function isInUIFrame() {
    return !document.location.href.startsWith("chrome://") && document.location.href.indexOf(EXTENSION_ROOT_URL) === 0;
}

    function _isDomainApplicable(domain) {
        return !domain || domain.test(document.location.href) || domain.test(window.origin);
    }

    function cmap(new_keystroke, old_keystroke, domain, new_annotation) {
        if (_isDomainApplicable(domain)) {
            dispatchSKEvent("front", ['addMapkey', "Omnibar", new_keystroke, old_keystroke]);
        }
    }

    /**
     * Map the key sequence `lhs` to `rhs` for mode `ctx` in ACE editor.
     *
     * @param {string} lhs a key sequence to replace
     * @param {string} rhs a key sequence to be replaced
     * @param {string} ctx a mode such as `insert`, `normal`.
     *
     * @example aceVimMap('J', ':bn', 'normal');
     */
    function aceVimMap(lhs, rhs, ctx) {
        dispatchSKEvent("front", ['addVimMap', lhs, rhs, ctx]);
    }

    /**
     * Add map key in ACE editor.
     *
     * @param {object} objects multiple objects to define key map in ACE, see more from [ace/keyboard/vim.js](https://github.com/ajaxorg/ace/blob/ec450c03b51aba3724cf90bb133708078d1f3de6/lib/ace/keyboard/vim.js#L927-L1099)
     *
     * @example
     * addVimMapKey(
     *     {
     *         keys: 'n',
     *         type: 'motion',
     *         motion: 'moveByCharacters',
     *         motionArgs: {
     *             forward: false
     *         }
     *     },
     *
     *     {
     *         keys: 'e',
     *         type: 'motion',
     *         motion: 'moveByLines',
     *         motionArgs: {
     *             forward: true,
     *             linewise: true
     *         }
     *     }
     * );
     */
    function addVimMapKey() {
        dispatchSKEvent("front", ['addVimKeyMap', Array.from(arguments)]);
    }

const userDefinedFunctions = {};
function mapkey(keys, annotation, jscode, options) {
    if (!options || _isDomainApplicable(options.domain)) {
        userDefinedFunctions[`normal:${keys}`] = jscode;
        dispatchSKEvent('api', ['mapkey', keys, annotation, options]);
    }
}
function imapkey(keys, annotation, jscode, options) {
    if (!options || _isDomainApplicable(options.domain)) {
        userDefinedFunctions[`insert:${keys}`] = jscode;
        dispatchSKEvent('api', ['imapkey', keys, annotation, options]);
    }
}
function vmapkey(keys, annotation, jscode, options) {
    if (!options || _isDomainApplicable(options.domain)) {
        userDefinedFunctions[`visual:${keys}`] = jscode;
        dispatchSKEvent('api', ['vmapkey', keys, annotation, options]);
   }
}

function map(new_keystroke, old_keystroke, domain, new_annotation) {
    dispatchSKEvent('api', ['map', new_keystroke, old_keystroke, domain, new_annotation]);
}
function imap(new_keystroke, old_keystroke, domain, new_annotation) {
    dispatchSKEvent('api', ['imap', new_keystroke, old_keystroke, domain, new_annotation]);
}
function lmap(new_keystroke, old_keystroke, domain, new_annotation) {
    dispatchSKEvent('api', ['lmap', new_keystroke, old_keystroke, domain, new_annotation]);
}
function vmap(new_keystroke, old_keystroke, domain, new_annotation) {
    dispatchSKEvent('api', ['vmap', new_keystroke, old_keystroke, domain, new_annotation]);
}
function showPopup(msg) {
    dispatchSKEvent('front', ['showPopup', msg]);
}

const functionsToListSuggestions = {};

let inlineQuery;
let hintsFunction;
let onClipboardReadFn;
initSKFunctionListener("user", {
    callUserFunction: (keys) => {
        if (userDefinedFunctions.hasOwnProperty(keys)) {
            userDefinedFunctions[keys]();
        }
    },
    getSearchSuggestions: (url, response, request, callbackId, origin) => {
        if (functionsToListSuggestions.hasOwnProperty(url)) {
            const ret = functionsToListSuggestions[url](response, request);
            dispatchSKEvent("front", [callbackId, ret]);
        }
    },
    performInlineQuery: (query, callbackId, origin) => {
        httpRequest({
            url: (typeof(inlineQuery.url) === "function") ? inlineQuery.url(query) : inlineQuery.url + query,
            headers: inlineQuery.headers
        }, function(res) {
            dispatchSKEvent("front", [callbackId, inlineQuery.parseResult(res)]);
        });
    },
    onClipboardRead: (resp) => {
        onClipboardReadFn(resp);
    },
    onHintClicked: (element) => {
        if (typeof(hintsFunction) === 'function') {
            hintsFunction(element);
        }
    },
}, true);

function addSearchAlias(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion, only_this_site_key, options) {
    functionsToListSuggestions[suggestion_url] = callback_to_parse_suggestion;
    dispatchSKEvent('api', ['addSearchAlias', alias, prompt, search_url, search_leader_key, suggestion_url, "user", only_this_site_key, options]);
}

function isEmptyObject(obj) {
    for (var name in obj) {
        return false;
    }
    return true;
}

function applyUserSettings(delta) {
    if (delta.error !== "") {
        if (window === top) {
            showPopup("[SurfingKeys] Error found in settings: " + delta.error);
        } else {
            console.log("[SurfingKeys] Error found in settings({0}): {1}".format(window.location.href, delta.error));
        }
    }
    if (!isEmptyObject(delta.settings)) {
        dispatchSKEvent("front", ['setUserSettings', delta.settings]);
    }
}

const api = {
    RUNTIME,
    aceVimMap,
    addVimMapKey,
    addSearchAlias,
    cmap,
    imap,
    imapkey,
    isElementPartiallyInViewport,
    getBrowserName,
    getClickableElements,
    lmap,
    vmap,
    map,
    mapkey,
    unmap: (keystroke, domain) => {
        dispatchSKEvent('api', ['unmap', keystroke, domain]);
    },
    iunmap: (keystroke, domain) => {
        dispatchSKEvent('api', ['iunmap', keystroke, domain]);
    },
    vunmap: (keystroke, domain) => {
        dispatchSKEvent('api', ['vunmap', keystroke, domain]);
    },
    unmapAllExcept: (keystrokes, domain) => {
        dispatchSKEvent('api', ['unmapAllExcept', keystrokes, domain]);
    },
    removeSearchAlias: (alias, search_leader_key, only_this_site_key) => {
        dispatchSKEvent('api', ['removeSearchAlias', alias, search_leader_key, only_this_site_key]);
    },
    searchSelectedWith: (se, onlyThisSite, interactive, alias) => {
        dispatchSKEvent('api', ['removeSearchAlias', se, onlyThisSite, interactive, alias]);
    },
    tabOpenLink,
    Clipboard: {
        write: (text) => {
            dispatchSKEvent('api', ['clipboard:write', text]);
        },
        read: (cb) => {
            onClipboardReadFn = cb;
            dispatchSKEvent('api', ['clipboard:read']);
        },
    },
    Hints: {
        click: (links, force) => {
            if (typeof(links) !== 'string') {
                if (links instanceof HTMLElement) {
                    links = [links];
                } else if (links instanceof Array) {
                    links = links.filter((m) => m instanceof HTMLElement);
                } else {
                    links = [];
                }
                if (links.length === 0) {
                    return;
                }
                links.forEach((m) => {
                    m.classList.add("surfingkeys--hints--clicking");
                });
                links = ".surfingkeys--hints--clicking";
            }
            dispatchSKEvent('api', ['hints:click', links, force]);
        },
        create: (cssSelector, onHintKey, attrs) => {
            hintsFunction = onHintKey;
            dispatchSKEvent('api', ['hints:create', cssSelector, "user", attrs]);
        },
        dispatchMouseClick: (element) => {
            dispatchSKEvent('hints', ['dispatchMouseClick'], element);
        },
        style: (css, mode) => {
            dispatchSKEvent('api', ['hints:style', css, mode]);
        },
    },
    Visual: {
        style: (element, style) => {
            dispatchSKEvent('api', ['visual:style', element, style]);
        },
    },
    Front: {
        registerInlineQuery: (args) => {
            inlineQuery = args;
            dispatchSKEvent('api', ['front:registerInlineQuery']);
        },
        openOmnibar: (args) => {
            dispatchSKEvent('api', ['front:openOmnibar', args]);
        },
        showPopup
    },
};

export default (extensionRootUrl, uf) => {
    EXTENSION_ROOT_URL = extensionRootUrl;
    if (isInUIFrame()) return;
    var settings = {}, error = "";
    try {
        uf(api, settings);
    } catch(e) {
        error = e.toString();
    }
    applyUserSettings({settings, error});
};
