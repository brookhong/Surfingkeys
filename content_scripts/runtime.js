var runtime = window.runtime || (function() {
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
            useLocalMarkdownAPI: true,
            passThroughTimeout: 0,
        },
        runtime_handlers: {}
    }, actions = {};
    if (!chrome.runtime.connect) {
        return self;
    }

    var _port = chrome.runtime.connect({
        name: 'main'
    });
    _port.onDisconnect.addListener(function(evt) {
        if (window === top) {
            console.log('reload triggered by runtime disconnection.');
            setTimeout(function() {
                window.location.reload();
            }, 1000);
        }
    });
    var callbacks = {};
    _port.onMessage.addListener(function(_message) {
        if (callbacks[_message.id]) {
            var f = callbacks[_message.id];
            // returns true to make callback stay for coming response.
            if (!f(_message)) {
                delete callbacks[_message.id];
            }
        } else if (actions[_message.action]) {
            var result = {
                id: _message.id,
                action: _message.action
            };
            actions[_message.action].forEach(function(a) {
                result.data = a.call(null, _message);
                if (_message.ack) {
                    _port.postMessage(result);
                }
            });
        } else if (window === top) {
            console.log("[unexpected runtime message] " + JSON.stringify(_message));
        }
    });

    self.on = function(message, cb) {
        if ( !(message in actions) ) {
            actions[message] = [];
        }
        actions[message].push(cb);
    };

    self.command = function(args, cb) {
        args.id = generateQuickGuid();
        if (cb) {
            callbacks[args.id] = cb;
            // request background to hold _sendResponse for a while to send back result
            args.ack = true;
        }
        _port.postMessage(args);
    };
    self.updateHistory = function(type, cmd) {
        var prop = type + 'History';
        runtime.command({
            action: 'getSettings',
            key: prop
        }, function(response) {
            var list = response.settings[prop] || [];
            var toUpdate = {};
            if (cmd.constructor.name === "Array") {
                toUpdate[prop] = cmd;
                self.command({
                    action: 'updateSettings',
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
                self.command({
                    action: 'updateSettings',
                    settings: toUpdate
                });
            }
        });
    };

    chrome.runtime.onMessage.addListener(function(msg, sender, response) {
        if (msg.target === 'content_runtime') {
            if (self.runtime_handlers[msg.subject]) {
                self.runtime_handlers[msg.subject](msg, sender, response);
            }
        }
    });

    var getTopURLPromise = new Promise(function(resolve, reject) {
        if (window === top) {
            resolve(window.location.href);
        } else {
            self.command({
                action: "getTopURL"
            }, function(rs) {
                resolve(rs.url);
            });
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
