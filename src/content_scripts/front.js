import {
    createElementWithContent,
    flashPressedLink,
    generateQuickGuid,
    getAnnotations,
    getBrowserName,
    getDocumentOrigin,
    httpRequest,
    isEditable,
    isInUIFrame,
    tabOpenLink,
} from './common/utils.js';
import { RUNTIME, dispatchSKEvent, runtime } from './common/runtime.js';
import createUiHost from './uiframe.js';

function createFront(insert, normal, hints, visual) {
    var self = {};
    // The agent is a front stub to talk with pages/frontend.html
    // that will live in all content window except the frontend.html
    // as there is no need to make this object live in frontend.html.

    var _uiUserSettings = [];
    function applyUserSettings() {
        for (var cmd of _uiUserSettings) {
            frontendCommand(cmd);
        }
    }

    var uiHost, _resolve;
    var frontendPromise = new Promise(function (resolve, reject) {
        if (window === top) {
            _resolve = resolve;
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

    document.addEventListener("surfingkeys:setUserSettings", function(evt) {
        _uiUserSettings.push({
            action: 'applyUserSettings',
            userSettings: evt.detail
        });
    });

    var _listSuggestions = {};
    self.addSearchAlias = function (alias, prompt, url, suggestionURL, listSuggestion) {
        if (suggestionURL && listSuggestion) {
            _listSuggestions[suggestionURL] = listSuggestion;
        }
        _uiUserSettings.push({
            action: 'addSearchAlias',
            alias: alias,
            prompt: prompt,
            url: url,
            suggestionURL: suggestionURL
        });
    };
    self.removeSearchAlias = function (alias) {
        _uiUserSettings.push({
            action: 'removeSearchAlias',
            alias: alias
        });
    };

    var _actions = {};

    self.performInlineQueryOnSelection = function(word) {
        var b = document.getSelection().getRangeAt(0).getClientRects()[0];
        self.performInlineQuery(word, b, function(pos, queryResult) {
            if (queryResult) {
                dispatchSKEvent('showBubble', [{
                    top: pos.top,
                    left: pos.left,
                    height: pos.height,
                    width: pos.width
                }, queryResult, false]);
            }
        });
    };
    function querySelectedWord() {
        var selection = document.getSelection();
        var word = selection.toString().trim();
        if (word && !/[\W_]/.test(word) && word.length && selection.type === "Range") {
            self.performInlineQueryOnSelection(word);
        }
    }
    document.addEventListener("surfingkeys:querySelectedWord", querySelectedWord);

    _actions["updateInlineQuery"] = function (message) {
        if (message.word) {
            self.performInlineQueryOnSelection(message.word);
        } else {
            querySelectedWord();
        }
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
    document.addEventListener("surfingkeys:addMapkey", function(evt) {
        const [ mode, new_keystroke, old_keystroke ] = evt.detail;
        _uiUserSettings.push({
            action: 'addMapkey',
            mode: mode,
            new_keystroke: new_keystroke,
            old_keystroke: old_keystroke
        });
    });
    document.addEventListener("surfingkeys:addVimMap", function(evt) {
        const [ lhs, rhs, ctx ] = evt.detail;
        _uiUserSettings.push({
            action: 'addVimMap',
            lhs: lhs,
            rhs: rhs,
            ctx: ctx
        });
    });
    self.addVimKeyMap = function (vimKeyMap) {
        _uiUserSettings.push({
            action: 'addVimKeyMap',
            vimKeyMap: vimKeyMap
        });
    };

    var frameElement = createElementWithContent('div', 'Hi, I\'m here now!', {id: "sk_frame"});
    frameElement.fromSurfingKeys = true;
    function highlightElement(sn) {
        document.documentElement.append(frameElement);
        var rect = sn.rect;
        frameElement.style.top = rect.top + "px";
        frameElement.style.left = rect.left + "px";
        frameElement.style.width = rect.width + "px";
        frameElement.style.height = rect.height + "px";
        frameElement.style.display = "";
        setTimeout(function() {
            frameElement.remove();
        }, sn.duration);
    }
    document.addEventListener("surfingkeys:highlightElement", function(evt) {
        highlightElement(evt.detail);
    });

    function getAllAnnotations() {
        return [ normal.mappings,
            visual.mappings,
            insert.mappings
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

    document.addEventListener("surfingkeys:showPopup", function(evt) {
        const [ content ] = evt.detail;
        frontendCommand({
            action: 'showPopup',
            content: content
        });
    });

    function hidePopup() {
        frontendCommand({
            action: 'hidePopup'
        });
    }
    document.addEventListener("surfingkeys:hidePopup", hidePopup);

    function updateElementBehindEditor(data) {
        // setEditorText and setValueWithEventDispatched are experimental APIs from Brook Build of Chromium
        // https://brookhong.github.io/2021/04/18/brook-build-of-chromium.html
        if (elementBehindEditor.nodeName === "DIV") {
            data = data.replace(/\n+$/, '');
            if (typeof elementBehindEditor.setEditorText === "function") {
                elementBehindEditor.setEditorText(data);
            } else {
                elementBehindEditor.innerText = data;
            }
        } else {
            if (typeof elementBehindEditor.setValueWithEventDispatched === "function") {
                elementBehindEditor.setValueWithEventDispatched(data);
            } else {
                elementBehindEditor.value = data;
                var evt = document.createEvent("HTMLEvents");
                evt.initEvent("change", false, true);
                elementBehindEditor.dispatchEvent(evt);
            }
        }
    }

    var onEditorSaved, elementBehindEditor;

    /**
     * Launch the vim editor.
     *
     * @param {HTMLElement} element the target element which the vim editor is launched for, this parameter can also be a string, which will be used as default content in vim editor.
     * @param {function} onWrite a callback function to be executed on written back from vim editor.
     * @param {string} [type=null] the type for the vim editor, which can be `url`, if not provided, it will be tag name of the target element.
     * @param {boolean} [useNeovim=false] the vim editor will be the embeded JS implementation, if `useNeovim` is true, neovim will be used through natvie messaging.
     * @name Front.showEditor
     *
     * @example
     * mapkey(';U', '#4Edit current URL with vim editor, and reload', function() {
     *     Front.showEditor(window.location.href, function(data) {
     *         window.location.href = data;
     *     }, 'url');
     * });
     */
    self.showEditor = function(element, onWrite, type, useNeovim) {
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
        const cmd = {
            action: 'showEditor',
            type: type || "textarea",
            initial_line: initial_line,
            content: content
        };
        if (useNeovim || runtime.conf.useNeovim) {
            cmd.file_name = `${new URL(window.location.origin).host}/${elementBehindEditor.nodeName.toLowerCase()}`;
        }
        frontendCommand(cmd);
    };

    self.chooseTab = function() {
        if (normal.repeats !== "") {
            RUNTIME('focusTabByIndex');
        } else {
            frontendCommand({
                action: 'chooseTab'
            });
        }
    };

    /**
     * Open the omnibar.
     *
     * @param {object} args `type` the sub type for the omnibar, which can be `Bookmarks`, `AddBookmark`, `History`, `URLs`, `RecentlyClosed`, `TabURLs`, `Tabs`, `Windows`, `VIMarks`, `SearchEngine`, `Commands`, `OmniQuery` and `UserURLs`.
     * @name Front.openOmnibar
     *
     * @example
     * mapkey('ou', '#8Open AWS services', function() {
     *     var services = Array.from(top.document.querySelectorAll('#awsc-services-container li[data-service-href]')).map(function(li) {
     *         return {
     *             title: li.querySelector("span.service-label").textContent,
     *             url: li.getAttribute('data-service-href')
     *         };
     *     });
     *     if (services.length === 0) {
     *         services = Array.from(top.document.querySelectorAll('div[data-testid="awsc-nav-service-list"] li[data-testid]>a')).map(function(a) {
     *             return {
     *                 title: a.innerText,
     *                 url: a.href
     *             };
     *         });
     *     }
     *     Front.openOmnibar({type: "UserURLs", extra: services});
     * }, {domain: /console.amazonaws|console.aws.amazon.com/i});
     */
    self.openOmnibar = function(args) {
        args.action = 'openOmnibar';
        frontendCommand(args);
    };

    var _inlineQuery;
    var _showQueryResult;
    self.performInlineQuery = function (query, pos, showQueryResult) {
        if (document.dictEnabled !== undefined) {
            if (window.location.protocol === "dictorium:") {
                if (window === top) {
                    window.location.href = query;
                } else {
                    window.postMessage({ type: 'DictoriumReload', word: query });
                }
            } else {
                window.postMessage({
                    type: "OpenDictoriumQuery",
                    word: query,
                    sentence: "",
                    pos: pos,
                    source: window.location.href
                });
            }
            hidePopup();
        } else if (_inlineQuery) {
            if (runtime.conf.autoSpeakOnInlineQuery) {
                readText(query);
            }
            query = query.toLocaleLowerCase();
            runtime.updateHistory('OmniQuery', query);
            httpRequest({
                url: (typeof(_inlineQuery.url) === "function") ? _inlineQuery.url(query) : _inlineQuery.url + query,
                headers: _inlineQuery.headers
            }, function(res) {
                showQueryResult(pos, _inlineQuery.parseResult(res));
            });
        } else if (isInUIFrame()) {
            _showQueryResult = function(result) {
                showQueryResult(pos, result);
            };
            document.getElementById("proxyFrame").contentWindow.postMessage({
                action: "performInlineQuery",
                pos: pos,
                query: query
            }, "*");
        } else {
            tabOpenLink("https://github.com/brookhong/Surfingkeys/wiki/Register-inline-query");
            hidePopup();
        }
    };

    self.registerInlineQuery = function(args) {
        _inlineQuery = args;
    };
    self.openOmniquery = function(args) {
        self.openOmnibar(({type: "OmniQuery", extra: args.query, style: args.style}));
    };

    document.addEventListener("surfingkeys:openFinder", function(evt) {
        frontendCommand({
            action: "openFinder"
        });
    });

    document.addEventListener("surfingkeys:showBanner", function(evt) {
        const [ msg, linger_time ] = evt.detail;
        frontendCommand({
            action: "showBanner",
            content: msg,
            linger_time: linger_time
        });
    });

    document.addEventListener("surfingkeys:showBubble", function(evt) {
        const [ pos, msg, noPointerEvents ] = evt.detail;
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
    });

    document.addEventListener("surfingkeys:hideBubble", function(evt) {
        frontendCommand({
            action: 'hideBubble'
        });
    });

    var _keyHints = {
        accumulated: "",
        candidates: {},
        key: ""
    };

    document.addEventListener("surfingkeys:hideKeystroke", function(evt) {
        _keyHints.accumulated = "";
        _keyHints.candidates = {};
        frontendCommand({
            action: 'hideKeystroke'
        });
    });

    document.addEventListener("surfingkeys:showKeystroke", function(evt) {
        const [ key, mode ] = evt.detail;
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
    });

    document.addEventListener("surfingkeys:showStatus", function(evt) {
        self.showStatus(...evt.detail);
    });

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
            normal.passFocus(true);
            elementBehindEditor.focus();
            insert.enter(elementBehindEditor);
        }
    };
    _actions["nextEdit"] = function(response) {
        var sel = hints.getSelector() || "input, textarea, *[contenteditable=true], select";
        sel = getElements(sel);
        if (sel.length) {
            var i = sel.indexOf(elementBehindEditor);
            i = (i + (response.backward ? -1 : 1)) % sel.length;
            sel = sel[i];
            scrollIntoViewIfNeeded(sel);
            flashPressedLink(sel);

            self.showEditor(sel);
        }
    };

    _actions["omnibar_query_entered"] = function(response) {
        runtime.updateHistory('OmniQuery', response.query);
        self.performInlineQuery(response.query, {
            top: 0,
            left: 80,
            height: 0,
            width: 100
        },function(pos, queryResult) {
            if (queryResult.constructor.name !== "Array") {
                queryResult = [queryResult];
            }
            if (getBrowserName() === "Chrome") {
                var sentence = visual.findSentenceOf(response.query);
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
        RUNTIME('executeScript', {
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
        if (window === top && uiHost && uiHost.shadowRoot.contains(document.activeElement)) {
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
            visual.visualUpdateForContentWindow(message.query);
            if (getBrowserName() === "Firefox") {
                frontendCommand({
                    action: "visualUpdatedForFirefox"
                });
            }
        }, 500);
    };

    _actions["visualClear"] = function(message) {
        clearPendingQuery();
        visual.visualClear();
    };

    _actions["visualEnter"] = function(message) {
        clearPendingQuery();
        visual.visualEnter(message.query);
    };

    _actions["emptySelection"] = function(message) {
        visual.emptySelection();
    };

    var _active = window === top;
    _actions['deactivated'] = function(message) {
        _active = false;
    };

    _actions['activated'] = function(message) {
        _active = true;
    };

    runtime.on('focusFrame', function(msg, sender, response) {
        if (msg.frameId === window.frameId) {
            window.focus();
            document.body.scrollIntoView({
                behavior: 'auto',
                block: 'center',
                inline: 'center'
            });
            highlightElement({
                duration: 500,
                rect: {
                    top: 0,
                    left: 0,
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            });
        }
    });

    window.addEventListener('message', function (event) {
        var _message = event.data;
        if (_message === undefined) {
            return;
        }
        if (_message.action === "performInlineQuery") {
            self.performInlineQuery(_message.query, _message.pos, function (pos, queryResult) {
                event.source.postMessage({
                    action: "performInlineQueryResult",
                    pos: pos,
                    result: queryResult
                }, event.origin);
            });
        } else if (_message.action === "performInlineQueryResult") {
            _showQueryResult(_message.pos, _message.result);
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
        } else if (_message.type === "DictoriumViewReady") {
            // make inline query also work on dictorium frame continuously
            _actions['activated'](_message);
        }
    }, true);

    var uiHostDetaching;
    self.attach = function() {
        if (!uiHost) {
            uiHost = createUiHost((res) => {
                _resolve(res);
                applyUserSettings();
            });
            document.documentElement.appendChild(uiHost);
        }
        if (uiHostDetaching) {
            clearTimeout(uiHostDetaching);
            uiHostDetaching = undefined;
        }
    };

    self.detach = function() {
        if (uiHost) {
            uiHostDetaching = setTimeout(function() {
                uiHost.detach();
                uiHost = undefined;
            }, 3000);
        }
    };

    return self;
}

export default createFront;
