import Mode from './common/mode.js';
import {
    createElementWithContent,
    flashPressedLink,
    generateQuickGuid,
    getAnnotations,
    getBrowserName,
    getDocumentOrigin,
    getElements,
    httpRequest,
    initSKFunctionListener,
    isEditable,
    isInUIFrame,
    scrollIntoViewIfNeeded,
    tabOpenLink,
} from './common/utils.js';
import { RUNTIME, dispatchSKEvent, runtime } from './common/runtime.js';
import createUiHost from './uiframe.js';

function createFront(insert, normal, hints, visual, browser) {
    var self = {};
    // The agent is a front stub to talk with pages/frontend.html
    // that will live in all content window except the frontend.html
    // as there is no need to make this object live in frontend.html.

    var _uiUserSettings = [];
    function applyUserSettings() {
        for (var cmd of _uiUserSettings) {
            self.command(cmd);
        }
    }

    var frontendPromise;

    function newFrontEnd() {
        frontendPromise = new Promise(function (resolve, reject) {
            createUiHost(browser, (res) => {
                resolve(res);
                applyUserSettings();
            });
        });
    }

    var _callbacks = {};
    self.command = function(args, successById) {
        args.toFrontend = true;
        args.origin = getDocumentOrigin();
        args.id = generateQuickGuid();
        if (successById) {
            args.ack = true;
            _callbacks[args.id] = successById;
        }
        if (window !== top) {
            runtime.postTopMessage(args);
        } else {
            if (!frontendPromise) {
                // no need to create frontend iframe if the action is to hide key stroke
                // and frontend UI must be created after document.body is ready(#2132)
                if (args.action === "hideKeystroke" || document.body === null) {
                    return;
                }
                newFrontEnd();
            }
            frontendPromise.then(function() {
                runtime.postTopMessage(args);
            });
        }
    };

    function applyUICommand(cmd) {
        _uiUserSettings.push(cmd);
        if (frontendPromise) {
            frontendPromise.then(function() {
                self.command(cmd);
            });
        }
    }

    var _listSuggestions = {};
    self.addSearchAlias = function (alias, prompt, url, suggestionURL, listSuggestion, options) {
        if (suggestionURL && listSuggestion) {
            _listSuggestions[suggestionURL] = listSuggestion;
        }
        applyUICommand({
            action: 'addSearchAlias',
            alias: alias,
            prompt: prompt,
            url: url,
            suggestionURL: suggestionURL,
            options: options,
        });
    };
    self.removeSearchAlias = function (alias) {
        applyUICommand({
            action: 'removeSearchAlias',
            alias: alias
        });
    };

    var _actions = {};
    var skCallbacks = {};

    self.performInlineQueryOnSelection = function(word) {
        var b = document.getSelection().getRangeAt(0).getClientRects()[0];
        self.performInlineQuery(word, b, function(pos, queryResult) {
            if (queryResult) {
                dispatchSKEvent("front", ['showBubble', {
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
            const listSuggestion = _listSuggestions[message.url];
            if (typeof listSuggestion === "function") {
                ret = listSuggestion(message.response, {
                    url: message.requestUrl,
                    query: message.query,
                });
            } else {
                ret = new Promise((resolve, reject) => {
                    const callbackId = generateQuickGuid();
                    skCallbacks[callbackId] = (res) => {
                        resolve(res);
                    };

                    dispatchSKEvent('user', ["getSearchSuggestions", message.url, message.response, {
                        url: message.requestUrl,
                        query: message.query,
                    }, callbackId]);
                });
            }
        }
        return ret;
    };

    self.executeCommand = function (cmd) {
        self.command({
            action: 'executeCommand',
            cmdline: cmd
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

    function getAllAnnotations() {
        let mappings = [ normal.mappings,
            visual.mappings,
            insert.mappings
        ];
        const lurk = normal.getLurkMode();
        if (lurk) {
            mappings.unshift(lurk.mappings);
        }
        return mappings.map(getAnnotations).reduce(function(a, b) {
            return a.concat(b);
        });
    }

    self.showUsage = function() {
        self.command({
            action: 'showUsage',
            metas: getAllAnnotations()
        });
    };

    self.getUsage = function(cb) {
        self.command({
            action: 'getUsage',
            metas: getAllAnnotations()
        }, function(response) {
            cb(response.data);
        });
    };

    function hidePopup() {
        self.command({
            action: 'hidePopup'
        });
    }

    function updateElementBehindEditor(data) {
        // setEditorText and setValueWithEventDispatched are experimental APIs from Brook Build of Chromium
        // https://brookhong.github.io/2021/04/18/brook-build-of-chromium.html
        if (elementBehindEditor.nodeName === "DIV") {
            if (elementBehindEditor.className === "CodeMirror-code") {
                window.getSelection().selectAllChildren(elementBehindEditor)
                let dataTransfer = new DataTransfer()
                dataTransfer.items.add(data, 'text/plain')
                elementBehindEditor.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dataTransfer}))
            } else {
                data = data.replace(/\n+$/, '');

                if (typeof elementBehindEditor.setEditorText === "function") {
                    elementBehindEditor.setEditorText(data);
                } else {
                    elementBehindEditor.innerText = data;
                }
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
                if (elementBehindEditor.className === "CodeMirror-code") {
                    let codeMirrorLines = elementBehindEditor.querySelectorAll(".CodeMirror-line")
                    content = Array.from(codeMirrorLines).map(el => el.innerText).join("\n")
                    // Remove the red dot (char code 8226) that CodeMirror uses to visualize the zero-width space.
                    content = content.replace(/\u200B/g, "")

                } else {
                    content = elementBehindEditor.innerText;
                }
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
        self.command(cmd);
    };

    self.chooseTab = function() {
        if (normal.repeats !== "") {
            RUNTIME('focusTabByIndex');
        } else {
            self.command({
                action: 'chooseTab'
            });
        }
    };

    self.groupTab = function() {
        self.command({
            action: 'groupTab'
        });
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
        self.command(args);
    };

    var _inlineQuery = false;
    var _showQueryResult;
    self.performInlineQuery = function (query, pos, showQueryResult) {
        if (document.dictEnabled !== undefined) {
            if (window.location.href.startsWith("chrome://dictorium-query/")) {
                if (window === top) {
                    window.location.href = `chrome://dictorium-query/${query}`;
                } else {
                    window.postMessage({dictorium_data: { type: 'DictoriumReload', word: query }});
                }
            } else {
                window.postMessage({dictorium_data: {
                    type: "OpenDictoriumQuery",
                    word: query,
                    sentence: "",
                    pos: pos,
                    source: window.location.href
                }});
            }
            hidePopup();
        } else if (_inlineQuery) {
            if (runtime.conf.autoSpeakOnInlineQuery) {
                browser.readText(query);
            }
            query = query.toLocaleLowerCase();
            RUNTIME('updateInputHistory', { OmniQuery: query });

            const callbackId = generateQuickGuid();
            skCallbacks[callbackId] = (res) => {
                showQueryResult(pos, res);
            };
            dispatchSKEvent('user', ["performInlineQuery", query, callbackId]);
        } else if (isInUIFrame()) {
            _showQueryResult = function(result) {
                showQueryResult(pos, result);
            };
            document.getElementById("proxyFrame").contentWindow.postMessage({surfingkeys_content_data: {
                action: "performInlineQuery",
                pos: pos,
                query: query
            }}, "*");
        } else {
            tabOpenLink("https://github.com/brookhong/Surfingkeys/wiki/Register-inline-query");
            hidePopup();
        }
    };

    /**
     * Register an inline query.
     *
     * @param {object} args `url`: string or function, the dictionary service url or a function to return the dictionary service url, `parseResult`: function, a function to parse result from dictionary service and return a HTML string to render explanation, `headers`: object[optional], in case your dictionary service needs authentication.
     * @name Front.registerInlineQuery
     *
     * @see [example](https://github.com/brookhong/Surfingkeys/wiki/Register-inline-query).
     */
    self.registerInlineQuery = function() {
        _inlineQuery = true;
    };
    self.openOmniquery = function(args) {
        self.openOmnibar(({type: "OmniQuery", extra: args.query, style: args.style}));
    };

    var _keyHints = {
        accumulated: "",
        candidates: {},
        key: ""
    };

    self.showStatus = function (msgs, duration) {
        // when showModeStatus is on, showStatus will cause uiHost injected too early
        // which could break some host scripts from sites in Firefox.
        const waitForHostScripts = (getBrowserName() === "Firefox") ? 1000 : 0;
        setTimeout(() => {
            self.command({
                action: "showStatus",
                contents: msgs,
                duration: duration
            });
        }, waitForHostScripts);
    };
    self.toggleStatus = function (visible) {
        self.command({
            action: "toggleStatus",
            visible: visible
        });
    };

    let onDialogResponseOk = null;
    _actions["dialogResponse"] = function (message) {
        if (message.result === "Ok" && onDialogResponseOk) {
            onDialogResponseOk();
        } else {
            onDialogResponseOk = null;
        }
    };

    skCallbacks = initSKFunctionListener("front", {
        showPopup: (content) => {
            self.command({
                action: 'showPopup',
                content
            });
        },
        showDialog: (question, onOk) => {
            self.command({
                action: 'showDialog',
                question
            });
            onDialogResponseOk = onOk;
        },
        applySettingsFromSnippets: (us) => {
            applyUICommand({
                action: 'applyUserSettings',
                userSettings: us
            });
            const cloneUS = JSON.parse(JSON.stringify(us));
            // overrides local settings from snippets
            for (var k in cloneUS) {
                if (runtime.conf.hasOwnProperty(k)) {
                    runtime.conf[k] = cloneUS[k];
                    delete cloneUS[k];
                }
           }
            if (runtime.conf.enableEmojiInsertion) {
                insert.enableEmojiInsertion();
            }
            if (Object.keys(cloneUS).length > 0 && window === top) {
                // left settings are for background, need not broadcast the update, neither persist into storage
                RUNTIME('updateSettings', {
                    scope: "snippets",
                    settings: cloneUS
                });
            }
            dispatchSKEvent('settingsFromSnippetsLoaded');
        },
        querySelectedWord,
        addMapkey: (mode, new_keystroke, old_keystroke) => {
            applyUICommand({
                action: 'addMapkey',
                mode: mode,
                new_keystroke: new_keystroke,
                old_keystroke: old_keystroke
            });
        },
        addVimMap: (lhs, rhs, ctx) => {
            applyUICommand({
                action: 'addVimMap',
                lhs: lhs,
                rhs: rhs,
                ctx: ctx
            });
        },
        addVimKeyMap: (vimKeyMap) => {
            applyUICommand({
                action: 'addVimKeyMap',
                vimKeyMap
            });
        },
        addCommand: (name, description) => {
            applyUICommand({
                action: 'addCommand',
                name: name,
                description: description
            });
        },
        highlightElement,
        hidePopup,
        openFinder: () => {
            self.command({
                action: "openFinder"
            });
        },
        showBanner: (msg, linger_time) => {
            self.command({
                action: "showBanner",
                content: msg,
                linger_time: linger_time
            });
        },
        showBubble: (pos, msg, noPointerEvents) => {
            if (msg.length > 0) {
                pos.winWidth = window.innerWidth;
                pos.winHeight = window.innerHeight;
                pos.winX = 0;
                pos.winY = 0;
                if (window.frameElement) {
                    pos.winX = window.frameElement.offsetLeft;
                    pos.winY = window.frameElement.offsetTop;
                }
                self.command({
                    action: "showBubble",
                    content: msg,
                    position: pos,
                    noPointerEvents: noPointerEvents
                });
            }
        },
        hideBubble: () => {
            self.command({
                action: 'hideBubble'
            });
        },
        hideKeystroke: () => {
            _keyHints.accumulated = "";
            _keyHints.candidates = {};
            self.command({
                action: 'hideKeystroke'
            });
        },
        showKeystroke: (key, mode) => {
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

            self.command({
                action: 'showKeystroke',
                keyHints: _keyHints
            });
        },
        openOmnibar: self.openOmnibar,
        showStatus: self.showStatus,
        toggleStatus: self.toggleStatus,
    });

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
            flashPressedLink(sel, () => {
                self.showEditor(sel);
            });
        }
    };

    _actions["omnibar_query_entered"] = function(response) {
        RUNTIME('updateInputHistory', { OmniQuery: response.query });
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

            self.command({
                action: 'updateOmnibarResult',
                words: queryResult
            });
        });
    };

    _actions["getBackFocus"] = function(response) {
        window.focus();
        if (window === top && frontendPromise) {
            frontendPromise.then((uiHost) => {
                if (uiHost.shadowRoot.contains(document.activeElement)) {
                    // fix for Firefox, blur from iframe for frontend after Omnibar closed.
                    document.activeElement.blur();
                }
            });
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
            visual.visualUpdate(message.query);
            self.command({
                action: "visualUpdated"
            });
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

    _actions["executeUserCommand"] = function(message) {
        dispatchSKEvent('user', ['executeUserCommand', message.name, message.args]);
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
        var _message = event.data && (event.data.surfingkeys_content_data || event.data.dictorium_data);
        if (_message === undefined) {
            return;
        }
        if (_message.action === "performInlineQuery") {
            self.performInlineQuery(_message.query, _message.pos, function (pos, queryResult) {
                event.source.postMessage({surfingkeys_content_data: {
                    action: "performInlineQueryResult",
                    pos: pos,
                    result: queryResult
                }}, event.origin);
            });
        } else if (_message.action === "performInlineQueryResult") {
            _showQueryResult(_message.pos, _message.result);
        } else if (_active) {
            if (_callbacks[_message.id]) {
                var f = _callbacks[_message.id];
                // returns true to make callback stay for coming response.
                if (!f(_message)) {
                    delete _callbacks[_message.id];
                }
            } else if (_message.action && _actions.hasOwnProperty(_message.action)) {
                var ret = _actions[_message.action](_message);
                if (_message.ack && ret) {
                    if (!ret.then) {
                        ret = Promise.resolve(ret);
                    }
                    ret.then((data) =>
                      runtime.postTopMessage({
                          data,
                          toFrontend: true,
                          origin: _message.origin,
                          id: _message.id
                      }));
                }
            }
        } else if (_message.action === "activated") {
            _actions['activated'](_message);
        } else if (_message.type === "DictoriumViewReady") {
            // make inline query also work on dictorium frame continuously
            _actions['activated'](_message);
        }
        if (!event.data.dictorium_data) {
            event.stopImmediatePropagation();
        }
    }, true);

    var uiHostDetaching;
    self.attach = function() {
        if (uiHostDetaching) {
            clearTimeout(uiHostDetaching);
            uiHostDetaching = undefined;
        }
        if (!frontendPromise) {
            newFrontEnd();
        }
        Mode.showStatus();
    };

    self.detach = function() {
        if (frontendPromise) {
            frontendPromise.then((uiHost) => {
                uiHostDetaching = setTimeout(function() {
                    uiHost.detach();
                    frontendPromise = undefined;
                }, 3000);
            });
        }
    };

    return self;
}

export default createFront;
