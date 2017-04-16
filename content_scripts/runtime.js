var runtime = window.runtime || (function() {
    var self = {
        conf: {
            lastKeys: "",
            // local part from settings
            useLocalMarkdownAPI: true,
            focusOnSaved: true,
            omnibarMaxResults: 20,
            tabsThreshold: 9,
            hintsThreshold: 10000,
            smoothScroll: true,
            collapseAfterYank: true,
            scrollStepSize: 70,
            nextLinkRegex: /((>>|next)+)/i,
            prevLinkRegex: /((<<|prev(ious)?)+)/i,
            hintAlign: "center",
            defaultSearchEngine: "g",
            showModeStatus: false,
            showProxyInStatusBar: false,
            richHintsForKeystroke: true,
            blacklistPattern: undefined,
            startToShowEmoji: 2,
            language: undefined,
            stealFocusOnLoad: true,
            historyStartTime: 0,
            historyEndTime: undefined,
            lastQuery: ""
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
            }, 500);
        }
    });
    var callbacks = {};
    _port.onMessage.addListener(function(_message) {
        if (callbacks[_message.id]) {
            var f = callbacks[_message.id];
            delete callbacks[_message.id];
            f(_message);
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
        } else {
            console.log("[unexpected runtime message] " + JSON.stringify(_message))
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
        if (!window.frameId && window.innerHeight && window.innerWidth) {
            window.frameId = generateQuickGuid();
        }
        args.windowId = window.frameId;
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
            } else if (cmd.length) {
                list = list.filter(function(c) {
                    return c.length && c !== cmd;
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

    return self;
})();
