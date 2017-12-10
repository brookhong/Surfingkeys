var Front = (function() {
    var self = {};
    // The agent is a front stub to talk with pages/frontend.html
    // that will live in all content window except the frontend.html
    // as there is no need to make this object live in frontend.html.

    // this object is stub of UI, it's UI consumer
    self.isProvider = function() {
        return document.location.href.indexOf(chrome.extension.getURL("")) === 0;
    };

    var _callbacks = {};
    function frontendCommand(args, successById) {
        args.commandToFrontend = true;
        args.origin = getDocumentOrigin();
        args.id = generateQuickGuid();
        if (successById) {
            args.ack = true;
            _callbacks[args.id] = successById;
        }
        runtime.postTopMessage(args);
    }

    self.applyUserSettings = function (us) {
        frontendCommand({
            action: 'applyUserSettings',
            userSettings: us
        });
    };

    self.executeCommand = function (cmd) {
        frontendCommand({
            action: 'executeCommand',
            cmdline: cmd
        });
    };

    self.highlightElement = function (sn) {
        sn.action = 'highlightElement';
        frontendCommand(sn);
    };

    self.showUsage = function() {
        frontendCommand({
            action: 'showUsage'
        });
    };

    self.getUsage = function(cb) {
        frontendCommand({
            action: 'getUsage'
        }, function(response) {
            cb(response.data);
        });
    };

    self.showPopup = function(content) {
        frontendCommand({
            action: 'showPopup',
            content: content
        });
    };

    self.hidePopup = function() {
        frontendCommand({
            action: 'hidePopup'
        });
    };

    function updateElementBehindEditor(data) {
        $(elementBehindEditor).val(data);
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("change", false, true);
        elementBehindEditor.dispatchEvent(evt);
    }

    var onEditorSaved, elementBehindEditor;
    self.showEditor = function(element, onWrite, type) {
        var content,
            type = type || element.localName,
            initial_line = 0;
        if (typeof(element) === "string") {
            content = element;
            elementBehindEditor = document.body;
        } else if (type === 'select') {
            var selected = $(element).val();
            var options = $(element).find('option').map(function(i) {
                if ($(this).val() === selected) {
                    initial_line = i;
                }
                return "{0} >< {1}".format($(this).text(), $(this).val());
            }).toArray();
            content = options.join('\n');
            elementBehindEditor = element;
        } else {
            content = $(element).val();
            elementBehindEditor = element;
        }
        onEditorSaved = onWrite || updateElementBehindEditor;
        frontendCommand({
            action: 'showEditor',
            type: type || "textarea",
            initial_line: initial_line,
            content: content
        });
    };

    self.chooseTab = function() {
        if (Normal.repeats !== "") {
            RUNTIME('focusTabByIndex');
        } else {
            frontendCommand({
                action: 'chooseTab'
            });
        }
    };

    self.openOmnibar = function(args) {
        args.action = 'openOmnibar';
        frontendCommand(args);
    };

    var onOmniQuery;
    self.openOmniquery = function(args) {
        onOmniQuery = function(query) {
            httpRequest({
                'url': (typeof(args.url) === "function") ? args.url(query) : args.url + query
            }, function(res) {
                var words = args.parseResult(res);

                frontendCommand({
                    action: 'updateOmnibarResult',
                    words: words
                });
            });
        };
        self.openOmnibar(({type: "OmniQuery", extra: args.query, style: args.style}));
    };

    self.openFinder = function() {
        frontendCommand({
            action: "openFinder"
        });
    };

    self.showBanner = function(msg, linger_time) {
        frontendCommand({
            action: "showBanner",
            content: msg,
            linger_time: linger_time
        });
    };

    self.showBubble = function(pos, msg) {
        frontendCommand({
            action: "showBubble",
            content: msg,
            position: pos
        });
    };

    self.hideBubble = function() {
        frontendCommand({
            action: 'hideBubble'
        });
    };

    self.hideKeystroke = function() {
        frontendCommand({
            action: 'hideKeystroke'
        });
    };

    self.showKeystroke = function(key, mode) {
        frontendCommand({
            action: 'showKeystroke',
            mode: mode,
            key: key
        });
    };

    self.showStatus = function (pos, msg, duration) {
        frontendCommand({
            action: "showStatus",
            content: msg,
            duration: duration,
            position: pos
        });
    };
    self.toggleStatus = function (visible) {
        frontendCommand({
            action: "toggleStatus",
            visible: visible
        });
    };

    var _actions = {};

    _actions["ace_editor_saved"] = function(response) {
        if (response.data !== undefined) {
            onEditorSaved(response.data);
        }
        if (runtime.conf.focusOnSaved && isEditable(elementBehindEditor)) {
            window.focus();
            Insert.enter(elementBehindEditor);
        }
    };
    _actions["nextEdit"] = function(response) {
        var sel = Hints.getSelector() || "input:visible, textarea:visible, *[contenteditable=true], select:visible";
        sel = $(sel).toArray();
        if (sel.length) {
            var i = sel.indexOf(elementBehindEditor);
            i = (i + (response.backward ? -1 : 1)) % sel.length;
            sel = sel[i];
            scrollIntoViewIfNeeded(sel);
            Hints.flashPressedLink(sel);

            self.showEditor(sel);
        }
    };

    _actions["omnibar_query_entered"] = function(response) {
        readText(response.query);
        runtime.updateHistory('OmniQuery', response.query);
        onOmniQuery(response.query);
    };

    _actions["executeScript"] = function(message) {
        runtime.command({
            action: 'executeScript',
            code: message.cmdline
        }, function (response) {
            frontendCommand({
                action: 'updateOmnibarResult',
                words: response.response
            });
        });
    };

    _actions["getBackFocus"] = function(response) {
        window.focus();
    };

    _actions["getPageText"] = function(response) {
        return document.body.innerText;
    };

    var _pendingQuery;
    function clearPendingQuery() {
        if (_pendingQuery) {
            clearTimeout(_pendingQuery);
            _pendingQuery = undefined;
        }
    }

    _actions["visualUpdate"] = function(message) {
        clearPendingQuery();
        _pendingQuery = setTimeout(function() {
            Visual.visualUpdateForContentWindow(message.query);
        }, 500);
    };

    _actions["visualClear"] = function(message) {
        clearPendingQuery();
        Visual.visualClear();
    };

    _actions["visualEnter"] = function(message) {
        clearPendingQuery();
        Visual.visualEnter(message.query);
    };

    var _active = false;
    _actions['deactivated'] = function(message) {
        _active = false;
    };

    _actions['activated'] = function(message) {
        _active = true;
        var userMappings = Normal.mappings.getMetas(function(m) { return !m.isDefault;}).map(function(m) {
            return {
                word: m.word,
                annotation: m.annotation,
                feature_group: m.feature_group
            };
        });
        frontendCommand({
            action: "addMappingForUsage",
            automatic: true,
            userMappings: userMappings
        });
    };

    runtime.runtime_handlers['focusFrame'] = function(msg, sender, response) {
        if (msg.frameId === window.frameId) {
            window.focus();
            scrollIntoViewIfNeeded(document.body);
            var rc = (window.frameElement || document.body).getBoundingClientRect();
            self.highlightElement({
                duration: 500,
                rect: {
                    top: rc.top,
                    left: rc.left,
                    width: rc.width,
                    height: rc.height
                }
            });

            Normal.exit();
            Normal.enter();
        }
    };

    window.addEventListener('message', function(event) {
        var _message = event.data;
        if (_active) {
            if (_message.responseToContent && _callbacks[_message.id]) {
                var f = _callbacks[_message.id];
                // returns true to make callback stay for coming response.
                if (!f(_message)) {
                    delete _callbacks[_message.id];
                }
            } else if (_message.commandToContent && _message.action && _actions.hasOwnProperty(_message.action)) {
                var ret = _actions[_message.action](_message);
                if (_message.ack) {
                    runtime.postTopMessage({
                        data: ret,
                        responseToFrontend: true,
                        origin: _message.origin,
                        id: _message.id
                    });
                }
            }
        } else if (_message.action === "activated") {
            _actions['activated'](_message);
        }
    }, true);

    return self;
})();

var Commands = { items: {} };
