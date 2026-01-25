function dispatchSKEvent(type, args, target) {
    if (target === undefined) {
        target = document;
    }
    target.dispatchEvent(new CustomEvent(`surfingkeys:${type}`, { 'detail': args }));
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
            runtime.on('onTtsEvent', callback);
        }
    } catch (e) {
        dispatchSKEvent("front", ['showPopup', '[runtime exception] ' + e]);
    }
}

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
    };
    self.bookMessage = function(message, cb) {
        if (_handlers[message]) {
            return false;
        } else {
            _handlers[message] = cb;
            return true;
        }
    };
    self.releaseMessage = function(message) {
        delete _handlers[message];
    };

    chrome.runtime.onMessage.addListener(function(msg, sender, response) {
        if (_handlers[msg.subject]) {
            _handlers[msg.subject](msg, sender, response);
        }
    });

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
            top.postMessage({surfingkeys_uihost_data: msg}, topUrl);
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
    runtime
};
