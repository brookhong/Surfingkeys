const SK_EVENT_PREFIX = "surfingkeys:";

/*
 * Every channel between SurfingKeys' own pieces is a DOM event on the document the
 * visited page also owns, so a fixed event name would be an open bus: page script
 * could dispatch clipboard:read or feedkeys, and could listen for the api object
 * handed out with defaultSettingsLoaded. The name therefore carries a scope drawn
 * at random per document, which page script has no way to learn.
 *
 * The DOM-event channels only. Page script can still drive the frontend iframe (the
 * omnibar, the editor) by window message: the relay in uiframe.js has to accept
 * messages from child frames, and a frame's content script and its page script are
 * the same window, so no check on origin or source can tell them apart.
 *
 * An extension document keeps the bare name, since several bundles share one --
 * options.html, markdown.html and neovim.html each load content.js next to their
 * own script -- and no page script can run there to abuse it.
 */
function initialChannelScope() {
    try {
        if (document.location.href.startsWith(chrome.runtime.getURL("/"))) {
            return "";
        }
    } catch (e) {
        // No extension APIs reachable from this world, so this is not one of the
        // extension's own pages: draw a scope.
    }
    const bytes = new Uint8Array(16);
    // Not randomUUID: it requires a secure context, and these channels run on
    // plain http pages too.
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

let channelScope = initialChannelScope();

function skEventName(type) {
    return channelScope === "" ? `${SK_EVENT_PREFIX}${type}` : `${SK_EVENT_PREFIX}${channelScope}:${type}`;
}

function skChannelScope() {
    return channelScope;
}

/*
 * Adopt a scope drawn elsewhere. Only the user-script world holding a Chrome MV3
 * user's snippets does this: it shares the document with the content script but not
 * this module's state, so it fetches that scope through the background (see
 * getChannelScope). Nothing in that world may dispatch or listen before it lands.
 */
function setChannelScope(scope) {
    channelScope = scope;
}

function dispatchSKEvent(type, args, target) {
    if (target === undefined) {
        target = document;
    }
    target.dispatchEvent(new CustomEvent(skEventName(type), { 'detail': args }));
}

/**
 * Call background `action` with `args`, the `callback` will be executed with response from background.
 *
 * @param {string} action a background action to be called.
 * @param {object} args the parameters to be passed to the background action.
 * @param {function} callback a function to be executed with the result from the background action.
 *
 * @example
 *
 * RUNTIME('getTabs', {queryInfo: {currentWindow: true}}, response => {
 *   console.log(response);
 * });
 */
function RUNTIME(action, args, callback) {
    var actionsRepeatBackground = ['closeTab', 'nextTab', 'previousTab', 'moveTab', 'reloadTab', 'setZoom', 'closeTabLeft','closeTabRight', 'focusTabByIndex'];
    (args = args || {}).action = action;
    if (actionsRepeatBackground.indexOf(action) !== -1) {
        // if the action can only be repeated in background, pass repeats to background with args,
        // and set RUNTIME.repeats 1, so that it won't be repeated in foreground's _handleMapKey
        args.repeats = RUNTIME.repeats;
        RUNTIME.repeats = 1;
    }
    try {
        args.needResponse = callback !== undefined;
        chrome.runtime.sendMessage(args, callback);
        if (action === 'read') {
            // Registers a handler, so this call makes the calling world a receiving
            // end for background messages from here on (see _listen).
            runtime.on('onTtsEvent', callback);
        }
    } catch (e) {
        dispatchSKEvent("front", ['showPopup', '[runtime exception] ' + e]);
    }
}
RUNTIME.repeats = 1;

const runtime = (function() {
    const self = {
        conf: {
            autoSpeakOnInlineQuery: false,
            lastKeys: "",
            // local part from settings
            blocklistPattern: undefined,
            lurkingPattern: undefined,
            disabledOnActiveElementPattern: undefined,
            smartCase: true,
            caseSensitive: false,
            clickablePat: /(https?:\/\/|thunder:\/\/|magnet:)\S+/ig,
            clickableSelector: "",
            editableSelector: "div.CodeMirror-scroll,div.ace_content",
            cursorAtEndOfInput: true,
            defaultLLMProvider: "ollama",
            defaultSearchEngine: "g",
            defaultVoice: "Daniel",
            // Named system prompts for the LLM chat, switched to with `/agents` or
            // opened straight into with `extra: {agent: "translator"}`. A definition
            // is the prompt itself or an object carrying it under `systemPrompt`:
            // `{translator: "You're a translator…"}`. The name "default" is reserved
            // for the built-in prompt, so an agent defined under it is never used.
            llmAgents: {},
            // These three only ever read the page the user opened the chat on and
            // take no destination, so they have nowhere to send anything and asking
            // about them would be friction on the common case. `search_page` and
            // `list_page_links` are served from the same snapshot as `read_page`
            // and report strictly less of it, so confirming them while the whole
            // page goes unasked would teach the user to approve rather than read.
            // Every other tool reaches beyond that page, so it is confirmed until
            // listed here.
            llmAllowedTools: ["read_page", "search_page", "list_page_links"],
            // How many tabs the LLM chat may hold open at once. Reaching it does not
            // fail a call: the next `open_url` points the OLDEST of those tabs at the
            // new address instead of opening one more, even when the model has not
            // read that page to the end -- so a long conversation costs a bounded
            // number of tabs, and the price of the bound is that a page can be taken
            // away before it was finished with. A tab the user opened is never counted
            // and never taken; one the chat opened and the user then navigated
            // somewhere of their own is likewise never taken, but goes on counting,
            // since it sits on the strip and in the chat's tab group because the chat
            // put it there. llmtools.js `DEFAULT_MAX_LLM_TABS` carries this same number
            // for a setting that is not a number at all.
            llmMaxTabs: 5,
            llmTranslateTarget: "auto",
            editableBodyCare: true,
            enableAutoFocus: true,
            enableEmojiInsertion: false,
            experiment: false,
            focusFirstCandidate: false,
            focusOnSaved: true,
            hintAlign: "center",
            hintExplicit: false,
            hintShiftNonActive: false,
            historyMUOrder: true,
            language: undefined,
            lastQuery: "",
            modeAfterYank: "",
            nextLinkRegex: /(\b(next)\b)|下页|下一页|后页|下頁|下一頁|後頁|>>|»/i,
            digitForRepeat: true,
            omnibarMaxResults: 10,
            omnibarHistoryCacheSize: 100,
            omnibarPosition: "middle",
            omnibarSuggestion: true,
            omnibarSuggestionTimeout: 200,
            omnibarTabsQuery: {},
            pageUrlRegex: [],
            prevLinkRegex: /(\b(prev|previous)\b)|上页|上一页|前页|上頁|上一頁|前頁|<<|«/i,
            repeatThreshold: 9,
            richHintsForKeystroke: 1000,
            scrollFallback: false,
            scrollStepSize: 70,
            showModeStatus: false,
            showProxyInStatusBar: false,
            smartPageBoundary: false,
            smoothScroll: true,
            startToShowEmoji: 2,
            stealFocusOnLoad: true,
            tabIndicesSeparator: "|",
            tabsThreshold: 100,
            verticalTabs: true,
            textAnchorPat: /(^[\n\r\s]*\S{3,}|\b\S{4,})/g,
            ignoredFrameHosts: ["https://tpc.googlesyndication.com"],
            scrollFriction: 0,
            aceKeybindings: "vim",
            caretViewport: null,
            mouseSelectToQuery: [],
            useNeovim: false,
            useLocalMarkdownAPI: true
        },
    }, _handlers = {};
    let _listening = false;

    const getTopURLPromise = new Promise(function(resolve, reject) {
        if (window === top) {
            resolve(window.location.href);
        } else {
            RUNTIME("getTopURL", null, function(rs) {
                resolve(rs.url);
            });
        }
    });

    self.on = function(message, cb) {
        _handlers[message] = cb;
        _listen();
    };
    self.bookMessage = function(message, cb) {
        if (_handlers[message]) {
            return false;
        } else {
            _handlers[message] = cb;
            _listen();
            return true;
        }
    };
    self.releaseMessage = function(message) {
        delete _handlers[message];
    };

    /*
     * Register the listener with the first handler, never before. A listener with no
     * handler is still a receiving end, and every world of a document is dispatched
     * the same message, so a world that returns without calling response closes the
     * reply port for the world that would have answered. The user-script world
     * carrying a Chrome MV3 user's snippets registers no handler at all, yet asks for
     * the channel scope the content script beside it answers -- listening there too
     * loses that answer whenever Chrome dispatches this world first, and without the
     * scope the snippets can reach nothing.
     *
     * Listening is one-way: releaseMessage drops a handler but never the listener.
     * That is only safe because nothing goes back to zero handlers -- the content
     * script keeps getChannelScope for the life of the document.
     */
    function _listen() {
        if (_listening) {
            return;
        }
        _listening = true;
        chrome.runtime.onMessage.addListener(function(msg, sender, response) {
            if (_handlers[msg.subject]) {
                _handlers[msg.subject](msg, sender, response);
            }
        });
    }

    self.getTopURL = function(cb) {
        getTopURLPromise.then(function(url) {
            cb(url);
        });
    };

    self.postTopMessage = function(msg) {
        getTopURLPromise.then(function(topUrl) {
            if (window === top) {
                // Firefox use "resource://pdf.js" as window.origin for pdf viewer
                topUrl = window.location.origin;
            }
            if (topUrl === "null" || new URL(topUrl).origin === "file://") {
                topUrl = "*";
            }
            top.postMessage(msg, topUrl);
        });
    };

    self.getCaseSensitive = function(query) {
        return self.conf.caseSensitive || (self.conf.smartCase && /[A-Z]/.test(query));
    };

    return self;
})();

export {
    RUNTIME,
    dispatchSKEvent,
    runtime,
    setChannelScope,
    skChannelScope,
    skEventName
};
