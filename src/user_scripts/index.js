import { RUNTIME, dispatchSKEvent, setChannelScope } from '../content_scripts/common/runtime.js';
import {
    aceVimMap,
    addVimMapKey,
    applyUserSettings,
    getBrowserName,
    getClickableElements,
    httpRequest,
    initSKFunctionListener,
    isElementPartiallyInViewport,
    showBanner,
    showPopup,
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

const userDefinedFunctions = {};
function mapkey(keys, annotation, jscode, options) {
    if (!options || _isDomainApplicable(options.domain)) {
        const opt = options || {};
        userDefinedFunctions[`normal:${keys}`] = jscode;
        opt.codeHasParameter = jscode.length;
        dispatchSKEvent('api', ['mapkey', keys, annotation, opt]);
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

const userDefinedCommands = {};
function addCommand(name, description, action) {
    userDefinedCommands[name] = action;
    dispatchSKEvent('front', ['addCommand', name, description]);
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

const functionsToListSuggestions = {};

let inlineQuery;
let hintsFunction;
let onClipboardReadFn;
let onEditorWriteFn;
let userScriptTask = () => {};
let hintsCreationResolve;
let _pendingOnEnter = null;
let runtimeRepeats = 1;
// Registered from the default export, once the channel scope is known: the name
// to listen on does not exist before that.
const userChannel = {
    runtimeRepeats: (repeats) => {
        runtimeRepeats = repeats;
    },
    callUserFunction: (keys, para) => {
        if (userDefinedFunctions.hasOwnProperty(keys)) {
            userDefinedFunctions[keys](para);
        }
    },
    executeUserCommand: (name, args) => {
        if (userDefinedCommands.hasOwnProperty(name)) {
            userDefinedCommands[name](...args);
        }
    },
    getSearchSuggestions: async (url, response, request, callbackId, origin) => {
        if (functionsToListSuggestions.hasOwnProperty(url)) {
            try {
                const ret = await functionsToListSuggestions[url](response, request);
                dispatchSKEvent("front", [callbackId, ret]);
            } catch (e) {
                console.error("Search suggestion callback error:", e);
                dispatchSKEvent("front", [callbackId, []]);
            }
        }
    },
    performInlineQuery: (query, callbackId, origin) => {
        const url = (typeof(inlineQuery.url) === "function") ? inlineQuery.url(query) : inlineQuery.url + query;
        httpRequest({
            url,
            headers: inlineQuery.headers
        }, function(res) {
            if (res.error) {
                dispatchSKEvent("front", [callbackId, `${res.error} on ${url}`]);
            } else {
                dispatchSKEvent("front", [callbackId, inlineQuery.parseResult(res)]);
            }
        });
    },
    runUserScript: () => {
        userScriptTask();
    },
    onClipboardRead: (resp) => {
        onClipboardReadFn(resp);
    },
    onEditorWrite: (data) => {
        onEditorWriteFn(data);
    },
    onHintClicked: (element, shiftKey) => {
        if (typeof(hintsFunction) === 'function') {
            hintsFunction(element, shiftKey);
        }
    },
    onHintCreated: (found) => {
        if (hintsCreationResolve) {
            hintsCreationResolve(found);
            hintsCreationResolve = null;
        }
    },
    userURLs_onEnter: (item, ctrlKey, shiftKey) => {
        if (_pendingOnEnter) {
            _pendingOnEnter(item, ctrlKey, shiftKey);
            _pendingOnEnter = null;
        }
    },
};

function addSearchAlias(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion, only_this_site_key, options) {
    if (!/^[\u0000-\u007f]*$/.test(alias)) {
        throw `Invalid alias ${alias}, which must be ASCII characters.`;
    }
    functionsToListSuggestions[suggestion_url] = callback_to_parse_suggestion;
    dispatchSKEvent('api', ['addSearchAlias', alias, prompt, search_url, search_leader_key, suggestion_url, "user", only_this_site_key, options]);
}

function createCssSelectorForElements(cssSelector, elements) {
    if (elements instanceof HTMLElement) {
        elements = [elements];
    } else if (elements instanceof Array) {
        elements = elements.filter((m) => m instanceof HTMLElement);
    } else {
        elements = [];
    }
    elements.forEach((m) => {
        m.classList.add(cssSelector);
    });
    return elements.length;
}

const api = {
    RUNTIME,
    aceVimMap,
    addVimMapKey,
    addSearchAlias,
    addCommand,
    cmap,
    imap,
    imapkey,
    isElementPartiallyInViewport,
    getBrowserName,
    getClickableElements,
    lmap,
    vmap,
    vmapkey,
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
    readText: (text, options) => {
        dispatchSKEvent('api', ['readText', text, options]);
    },
    removeSearchAlias: (alias, search_leader_key, only_this_site_key) => {
        dispatchSKEvent('api', ['removeSearchAlias', alias, search_leader_key, only_this_site_key]);
    },
    searchSelectedWith: (se, onlyThisSite, interactive, alias) => {
        dispatchSKEvent('api', ['searchSelectedWith', se, onlyThisSite, interactive, alias]);
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
                const hintsClicking = "surfingkeys--hints--clicking";
                if (createCssSelectorForElements(hintsClicking, links) === 0) {
                    return;
                }
                links = `.${hintsClicking}`;
            }
            dispatchSKEvent('api', ['hints:click', links, force]);
        },
        create: (cssSelector, onHintKey, attrs) => {
            if (cssSelector instanceof RegExp) {
                // Forward the pattern as a plain object; it is rebuilt into a
                // RegExp on the content-script side (see api.js "hints:create").
                cssSelector = { source: cssSelector.source, flags: cssSelector.flags };
            } else if (typeof(cssSelector) !== 'string') {
                const hintsCreating = "surfingkeys--hints--creating";
                if (createCssSelectorForElements(hintsCreating, cssSelector) === 0) {
                    return false;
                }
                cssSelector = `.${hintsCreating}`;
            }
            hintsFunction = onHintKey;
            const promise = new Promise((resolve, reject) => {
                hintsCreationResolve = resolve;
            });
            dispatchSKEvent('api', ['hints:create', cssSelector, "user", attrs]);
            return promise;
        },
        dispatchMouseClick: (element) => {
            dispatchSKEvent('hints', ['dispatchMouseClick'], element);
        },
        style: (css, mode) => {
            dispatchSKEvent('api', ['hints:style', css, mode]);
        },
        setCharacters: (chars) => {
            dispatchSKEvent('api', ['hints:setCharacters', chars]);
        },
        setNumeric: () => {
            dispatchSKEvent('api', ['hints:setNumeric']);
        },
    },
    Normal: {
        feedkeys: (keys) => {
            dispatchSKEvent('api', ['normal:feedkeys', keys]);
        },
        jumpVIMark: (mark) => {
            dispatchSKEvent('api', ['normal:jumpVIMark', mark]);
        },
        passThrough: (timeout) => {
            dispatchSKEvent('api', ['normal:passThrough', timeout]);
        },
        scroll: (type) => {
            dispatchSKEvent('api', ['normal:scroll', type]);
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
        showEditor: (element, onWrite, type, useNeovim) => {
            if (typeof(element) !== 'string') {
                const elementEditing = "surfingkeys--element--editing";
                if (createCssSelectorForElements(elementEditing, element) === 0) {
                    return;
                }
                element = `.${elementEditing}`;
            }
            onEditorWriteFn = onWrite;
            dispatchSKEvent('api', ['front:showEditor', element, type, useNeovim]);
        },
        openOmnibar: (args) => {
            _pendingOnEnter = null;
            if (typeof args.onEnter === 'function') {
                _pendingOnEnter = args.onEnter;
                args = Object.assign({}, args, { _hasCustomOnEnter: true });
                delete args.onEnter;
            }
            dispatchSKEvent('api', ['front:openOmnibar', args]);
        },
        showBanner,
        showPopup
    },
};

const CHANNEL_SCOPE_ATTEMPTS = 20;
const CHANNEL_SCOPE_RETRY = 100;
const CHANNEL_SCOPE_TIMEOUT = 1000;

/*
 * Fetch the scope naming this document's DOM-event channels, which the background
 * reads back out of the content script sharing this document. That content script
 * is injected at document_start and this world at document_idle, so the answer is
 * normally there on the first ask; a retry covers a frame whose content script has
 * not answered yet, since without the scope this world can neither name a channel
 * nor be reached on one.
 *
 * Both the first failure and the give-up are reported, because nothing else reports
 * either and the symptom alone looks like the snippets being wrong: with no scope
 * they cannot reach SurfingKeys at all, so every mapping in them does nothing.
 */
function withChannelScope(onScope, attemptsLeft = CHANNEL_SCOPE_ATTEMPTS) {
    const giveUp = (why) => {
        console.error(`[SurfingKeys] settings snippets will not run here (${why})`);
    };
    const askAgain = (why) => {
        if (attemptsLeft === 0) {
            giveUp(why);
            return;
        }
        // Said on the first failure only: the whole budget can take twenty seconds to
        // run out, and a frame that recovers on its second ask should not be silent
        // for that long, nor a frame that never does say it twenty times.
        if (attemptsLeft === CHANNEL_SCOPE_ATTEMPTS) {
            console.warn(`[SurfingKeys] still waiting to run the settings snippets here (${why})`);
        }
        setTimeout(() => withChannelScope(onScope, attemptsLeft - 1), CHANNEL_SCOPE_RETRY);
    };
    let answered = false;
    // A send that throws reaches neither the callback below nor anything a person
    // will see: RUNTIME reports it by dispatching a front event, which in this world
    // is named after a scope nothing has adopted, so it arrives nowhere. Without this
    // timer one such throw parks the snippets for the life of the document.
    const noAnswer = setTimeout(() => {
        answered = true;
        askAgain("no answer");
    }, CHANNEL_SCOPE_TIMEOUT);
    RUNTIME("getChannelScope", {}, (resp) => {
        if (answered) {
            return;
        }
        answered = true;
        clearTimeout(noAnswer);
        if (resp && typeof resp.scope === "string") {
            onScope(resp.scope);
        } else if (resp && resp.terminal) {
            giveUp(resp.error);
        } else {
            askAgain(resp && resp.error ? resp.error : "no answer");
        }
    });
}

export default (extensionRootUrl, uf) => {
    EXTENSION_ROOT_URL = extensionRootUrl;
    if (isInUIFrame()) return;
    userScriptTask = () => {
        var settings = {}, error = "";
        try {
            uf(api, settings);
        } catch(e) {
            error = e.toString();
        }
        applyUserSettings({settings, error});
    };
    // The channels are DOM events named after a scope this world is given no other
    // way, so nothing here can reach the content script until it arrives -- including
    // the snippets, which would otherwise map keys onto channels that go nowhere. The
    // content script starts them once it sees this announcement and has its own
    // settings in place.
    withChannelScope((scope) => {
        setChannelScope(scope);
        initSKFunctionListener("user", userChannel, true);
        /**
         * The content script owns the repeat count. DOM dispatch is synchronous,
         * so consuming it here reaches the mapping loop before its next iteration;
         * a separate count would lose the first command and duplicate prefixed ones.
         */
        Object.defineProperty(RUNTIME, 'repeats', {
            configurable: true,
            enumerable: true,
            get: () => {
                dispatchSKEvent('api', ['runtime:getRepeats']);
                return runtimeRepeats;
            },
            set: (repeats) => {
                dispatchSKEvent('api', ['runtime:setRepeats', repeats]);
            },
        });
        dispatchSKEvent("userScriptListening");
    });
};
