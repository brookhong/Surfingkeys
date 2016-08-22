var runtime = window.runtime || (function() {
    var self = {
        successById: {},
        conf: {},       // local part from settings
        runtime_handlers: {}
    }, actions = {};
    var _port = chrome.runtime.connect({
        name: 'main'
    });
    _port.onDisconnect.addListener(function(evt) {
        if (window === top) {
            console.log('reload triggered by runtime disconnection.');
            setTimeout(function() {
                window.location.reload();
            }, 100);
        }
    });
    _port.onMessage.addListener(function(_message) {
        if (self.successById[_message.id]) {
            var f = self.successById[_message.id];
            delete self.successById[_message.id];
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

    self.command = function(args, successById) {
        args.id = generateQuickGuid();
        if (successById) {
            self.successById[args.id] = successById;
            // request background to hold _sendResponse for a while to send back result
            args.ack = true;
        }
        _port.postMessage(args);
    };
    self.frontendCommand = function(args, successById) {
        args.toFrontend = true;
        if (window === top) {
            createFrontEnd();
        }
        self.command(args, successById);
    };
    self.contentCommand = function(args, successById) {
        args.toContent = true;
        self.command(args, successById);
    };
    self.updateHistory = function(type, cmd) {
        var prop = type + 'History';
        runtime.command({
            action: 'localData',
            data: prop
        }, function(response) {
            var list = response.data[prop] || [];
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
