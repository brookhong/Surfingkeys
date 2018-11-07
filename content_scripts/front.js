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

    self.registerAction = function(action, cb) {
        _actions[action] = cb;
    };

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

    var frameElement = createElement('<div id=sk_frame>');
    self.highlightElement = function (sn) {
        document.body.append(frameElement);
        var rect = sn.rect;
        frameElement.style.top = rect.top + "px";
        frameElement.style.left = rect.left + "px";
        frameElement.style.width = rect.width + "px";
        frameElement.style.height = rect.height + "px";
        frameElement.style.display = "";
        setTimeout(function() {
            frameElement.remove();
        }, sn.duration);
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
        if (elementBehindEditor.nodeName === "DIV") {
            elementBehindEditor.innerText = data;
        } else {
            elementBehindEditor.value = data;
        }
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
            var selected = element.value;
            content = Array.from(element.querySelectorAll('option')).map(function(n, i) {
                if (n.value === selected) {
                    initial_line = i;
                }
                return n.innerText.trim() + " >< " + n.value;
            }).join('\n');
            elementBehindEditor = element;
        } else {
            elementBehindEditor = element;
            if (elementBehindEditor.nodeName === "DIV") {
                content = elementBehindEditor.innerText;
            } else {
                content = elementBehindEditor.value;
            }
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

    var _inlineQuery;
    var _showQueryResult;
    self.performInlineQuery = function (query, showQueryResult) {
        if (_inlineQuery) {
            query = query.toLocaleLowerCase();
            runtime.updateHistory('inlineQuery', query);
            httpRequest({
                url: (typeof(_inlineQuery.url) === "function") ? _inlineQuery.url(query) : _inlineQuery.url + query,
                headers: _inlineQuery.headers
            }, function(res) {
                showQueryResult(_inlineQuery.parseResult(res));
            });
        } else if (Front.isProvider()) {
            _showQueryResult = showQueryResult;
            document.getElementById("proxyFrame").contentWindow.postMessage({
                action: "performInlineQuery",
                query: query
            }, "*");
        } else {
            tabOpenLink("https://github.com/brookhong/Surfingkeys/wiki/Register-inline-query");
            self.hidePopup();
        }
    };

    self.registerInlineQuery = function(args) {
        _inlineQuery = args;
    };
    self.openOmniquery = function(args) {
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

    self.showBubble = function(pos, msg, noPointerEvents) {
        if (msg.length > 0) {
            pos.winWidth = window.innerWidth;
            pos.winHeight = window.innerHeight;
            pos.winX = 0;
            pos.winY = 0;
            if (window.frameElement) {
                pos.winX = window.frameElement.offsetLeft;
                pos.winY = window.frameElement.offsetTop;
            }
            frontendCommand({
                action: "showBubble",
                content: msg,
                position: pos,
                noPointerEvents: noPointerEvents
            });
        }
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

    self.getFrameId = function () {
        if (document.body.offsetWidth && document.body.offsetHeight && document.body.innerText
            && !window.frameId) {
            window.frameId = generateQuickGuid();
        }
        return window.frameId;
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
        var sel = Hints.getSelector() || "input, textarea, *[contenteditable=true], select";
        sel = getElements(sel);
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
        self.performInlineQuery(response.query, function(queryResult) {
            if (queryResult.constructor.name !== "Array") {
                queryResult = [queryResult];
            }
            if (window.navigator.userAgent.indexOf("Firefox") === -1) {
                var sentence = Visual.findSentenceOf(response.query);
                if (sentence.length > 0) {
                    queryResult.push(sentence);
                }
            }

            frontendCommand({
                action: 'updateOmnibarResult',
                words: queryResult
            });
        });
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
            var rc = document.body.getBoundingClientRect();
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

    document.addEventListener('DOMContentLoaded', function (e) {
        if (window.location.href.indexOf(chrome.extension.getURL("/pages/pdf_viewer.html")) === 0) {
            document.getElementById("proxyFrame").src = window.location.search.substr(3);
        }
    });

    window.addEventListener('message', function (event) {
        var _message = event.data;
        if (_message.action === "performInlineQuery") {
            self.performInlineQuery(_message.query, function (queryResult) {
                event.source.postMessage({
                    action: "performInlineQueryResult",
                    result: queryResult
                }, event.origin);
            });
        } else if (_message.action === "performInlineQueryResult") {
            _showQueryResult(_message.result);
        } else if (_active) {
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
