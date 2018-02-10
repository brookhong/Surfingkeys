var Front = (function() {
    var self = {};
    // The agent is a front stub to talk with pages/frontend.html
    // that will live in all content window except the frontend.html
    // as there is no need to make this object live in frontend.html.

    // this object is stub of UI, it's UI consumer
    self.isProvider = function() {
        return document.location.href.indexOf(chrome.extension.getURL("")) === 0;
    };

    var frontendPromise = new Promise(function (resolve, reject) {
        if (window === top) {
            self.resolve = resolve;
        } else {
            resolve(window.location.href);
        }
    });

    var _callbacks = {};
    function frontendCommand(args, successById) {
        args.commandToFrontend = true;
        args.origin = getDocumentOrigin();
        args.id = generateQuickGuid();
        if (successById) {
            args.ack = true;
            _callbacks[args.id] = successById;
        }
        frontendPromise.then(function() {
            runtime.postTopMessage(args);
        });
    }

    self.applyUserSettings = function (us) {
        frontendCommand({
            action: 'applyUserSettings',
            userSettings: us
        });
    };

    var _listSuggestions = {};
    self.addSearchAlias = function (alias, prompt, url, suggestionURL, listSuggestion) {
        if (suggestionURL && listSuggestion) {
            _listSuggestions[suggestionURL] = listSuggestion;
        }
        frontendCommand({
            action: 'addSearchAlias',
            alias: alias,
            prompt: prompt,
            url: url,
            suggestionURL: suggestionURL
        });
    };
    self.removeSearchAlias = function (alias) {
        frontendCommand({
            action: 'removeSearchAlias',
            alias: alias
        });
    };

    var _actions = {};

    _actions["getSearchSuggestions"] = function (message) {
        var ret = null;
        if (_listSuggestions.hasOwnProperty(message.url)) {
            ret = _listSuggestions[message.url](message.response);
        }
        return ret;
    };

    self.executeCommand = function (cmd) {
        frontendCommand({
            action: 'executeCommand',
            cmdline: cmd
        });
    };
    self.addCMap = function (new_keystroke, old_keystroke) {
        frontendCommand({
            action: 'addCMap',
            new_keystroke: new_keystroke,
            old_keystroke: old_keystroke
        });
    };
    self.addVimMap = function (lhs, rhs, ctx) {
        frontendCommand({
            action: 'addVimMap',
            lhs: lhs,
            rhs: rhs,
            ctx: ctx
        });
    };
    self.addVimKeyMap = function (vimKeyMap) {
        frontendCommand({
            action: 'addVimKeyMap',
            vimKeyMap: vimKeyMap
        });
    };

    self.highlightElement = function (sn) {
        sn.action = 'highlightElement';
        frontendCommand(sn);
    };

    function getAllAnnotations() {
        return [ Normal.mappings,
            Visual.mappings,
            Insert.mappings
        ].map(getAnnotations).reduce(function(a, b) {
            return a.concat(b);
        });
    }

    self.showUsage = function() {
        frontendCommand({
            action: 'showUsage',
            metas: getAllAnnotations()
        });
    };

    self.getUsage = function(cb) {
        frontendCommand({
            action: 'getUsage',
            metas: getAllAnnotations()
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

                if (window.navigator.userAgent.indexOf("Firefox") === -1) {
                    words.push(Visual.findSentenceOf(query));
                }

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

    var _keyHints = {
        accumulated: "",
        candidates: {},
        key: ""
    };

    self.hideKeystroke = function() {
        _keyHints.accumulated = "";
        _keyHints.candidates = {};
        frontendCommand({
            action: 'hideKeystroke'
        });
    };

    self.showKeystroke = function(key, mode) {
        _keyHints.accumulated += key;
        _keyHints.key = key;
        _keyHints.candidates = {};

        var root = mode.mappings.find(_keyHints.accumulated);
        if (root) {
            root.getMetas(function(m) {
                return true;
            }).forEach(function(m) {
                _keyHints.candidates[m.word] = {
                    annotation: m.annotation
                };
            });
        }

        frontendCommand({
            action: 'showKeystroke',
            keyHints: _keyHints
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

    _actions["ace_editor_saved"] = function(response) {
        if (response.data !== undefined) {
            onEditorSaved(response.data);
        }
        if (runtime.conf.focusOnSaved && isEditable(elementBehindEditor)) {
            Normal.passFocus(true);
            elementBehindEditor.focus();
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
        if (window === top && document.activeElement === ifr[0]) {
            // fix for Firefox, blur from iframe for frontend after Omnibar closed.
            document.activeElement.blur();
        }
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
            if (window.navigator.userAgent.indexOf("Firefox") !== -1) {
                frontendCommand({
                    action: "visualUpdatedForFirefox"
                });
            }
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
