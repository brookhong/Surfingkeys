var runtime = (function() {
    var self = {
        conf: {
            lastKeys: "",
            // local part from settings
            blacklistPattern: undefined,
            smartCase: true,
            caseSensitive: false,
            clickablePat: /(https?:\/\/|thunder:\/\/|magnet:)\S+/ig,
            clickableSelector: "",
            cursorAtEndOfInput: true,
            defaultSearchEngine: "g",
            defaultVoice: "Daniel",
            editableBodyCare: true,
            enableAutoFocus: true,
            experiment: false,
            focusFirstCandidate: false,
            focusOnSaved: true,
            hintAlign: "center",
            historyMUOrder: true,
            language: undefined,
            lastQuery: "",
            modeAfterYank: "",
            nextLinkRegex: /(\b(next)\b)|下页|下一页|后页|>>|»/i,
            digitForRepeat: true,
            omnibarMaxResults: 10,
            omnibarPosition: "middle",
            omnibarSuggestion: true,
            omnibarSuggestionTimeout: 200,
            omnibarTabsQuery: {},
            pageUrlRegex: [],
            prevLinkRegex: /(\b(prev|previous)\b)|上页|上一页|前页|<<|«/i,
            richHintsForKeystroke: 1000,
            scrollStepSize: 70,
            showModeStatus: false,
            showProxyInStatusBar: false,
            smartPageBoundary: false,
            smoothScroll: true,
            startToShowEmoji: 2,
            stealFocusOnLoad: true,
            tabsThreshold: 9,
            textAnchorPat: /(^[\n\r\s]*\S{3,}|\b\S{4,})/g,
            ignoredFrameHosts: ["https://tpc.googlesyndication.com"],
            scrollFriction: 0,
            aceKeybindings: "vim",
            caretViewport: null,
            mouseSelectToQuery: [],
            useLocalMarkdownAPI: true
        },
    }, _handlers = {};

    var getTopURLPromise = new Promise(function(resolve, reject) {
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

    self.updateHistory = function(type, cmd) {
        var prop = type + 'History';
        RUNTIME('getSettings', {
            key: prop
        }, function(response) {
            var list = response.settings[prop] || [];
            var toUpdate = {};
            if (cmd.constructor.name === "Array") {
                toUpdate[prop] = cmd;
                RUNTIME('updateSettings', {
                    settings: toUpdate
                });
            } else if (cmd.trim().length && cmd !== ".") {
                list = list.filter(function(c) {
                    return c.trim().length && c !== cmd && c !== ".";
                });
                list.unshift(cmd);
                if (list.length > 50) {
                    list.pop();
                }
                toUpdate[prop] = list;
                RUNTIME('updateSettings', {
                    settings: toUpdate
                });
            }
        });
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
            top.postMessage(msg, topUrl);
        });
    };

    self.getCaseSensitive = function(query) {
        return self.conf.caseSensitive || (self.conf.smartCase && /[A-Z]/.test(query));
    };

    return self;
})();
