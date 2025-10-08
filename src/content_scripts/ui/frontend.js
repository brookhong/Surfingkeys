import { encode } from 'js-base64';
import {
    attachFaviconToImgSrc,
    createElementWithContent,
    generateQuickGuid,
    getAnnotations,
    getBrowserName,
    getWordUnderCursor,
    htmlEncode,
    initL10n,
    initSKFunctionListener,
    refreshHints,
    rotateInput,
    setSanitizedContent,
    mapInMode
} from '../common/utils.js';
import { RUNTIME, runtime } from '../common/runtime.js';
import KeyboardUtils from '../common/keyboardUtils';
import Mode from '../common/mode';
import createClipboard from '../common/clipboard.js';
import createInsert from '../common/insert.js';
import createNormal from '../common/normal.js';
import createVisual from '../common/visual.js';
import createHints from '../common/hints.js';
import createAPI from '../common/api.js';
import createDefaultMappings from '../common/default.js';
import createOmnibar from './omnibar.js';
import createCommands from './command.js';

const Front = (function() {
    const clipboard = createClipboard();
    Mode.init();
    const insert = createInsert();
    const normal = createNormal(insert);
    normal.enter();
    const hints = createHints(insert, normal, clipboard);
    const visual = createVisual(clipboard, hints);

    const self = new Mode("Front");
    self._actions = {};
    self.topSize = [0, 0];
    const omnibar = createOmnibar(self, clipboard);

    createCommands(normal, omnibar.command, omnibar);

    const modes = {
        Insert: insert,
        Normal: normal,
        Visual: visual,
        Omnibar: omnibar,
    };

    const api = createAPI(clipboard, insert, normal, hints, visual, self, {});
    createDefaultMappings(api, clipboard, insert, normal, hints, visual, self);

    var _actions = self._actions,
        _callbacks = {};
    self.contentCommand = function(args, successById) {
        args.toContent = true;
        args.id = generateQuickGuid();
        if (successById) {
            args.ack = true;
            _callbacks[args.id] = successById;
        }
        top.postMessage({surfingkeys_uihost_data: args}, self.topOrigin);
    };

    self.postMessage = function(args) {
        top.postMessage({surfingkeys_uihost_data: args}, self.topOrigin);
    };

    var pressedHintKeys = "";
    var _display;
    self.addEventListener('keydown', function(event) {
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            self.hidePopup();
            event.sk_stopPropagation = true;
        } else if (_display && _display.style.display !== "none") {
            const tabHints = _display.querySelectorAll('div>div.sk_tab_hint');
            if (tabHints.length > 0) {
                const key = event.sk_keyName;
                const characters = hints.getCharacters().toLowerCase();
                if (event.keyCode === KeyboardUtils.keyCodes.backspace) {
                    if (pressedHintKeys.length > 0) {
                        pressedHintKeys = pressedHintKeys.substr(0, pressedHintKeys.length - 1);
                        refreshHints(tabHints, pressedHintKeys);
                    }
                } else if (characters.indexOf(key.toLowerCase()) !== -1) {
                    pressedHintKeys = pressedHintKeys + key.toUpperCase();
                    const hintState = refreshHints(tabHints, pressedHintKeys);
                    if (hintState.matched) {
                        _display.onHit(hintState.matched);
                        pressedHintKeys = "";
                        self.hidePopup();
                    } else if (hintState.candidates === 0) {
                        pressedHintKeys = "";
                        self.hidePopup();
                    }
                } else {
                    showElement(_omnibar, () => {
                        _omnibar.onShow({type: 'Tabs'});
                    });
                }

                event.sk_stopPropagation = true;
            }
        }
    });

    var _state;
    function State(pointerEvents, frameHeight, onEnter) {
        this.enter = function() {
            onEnter && onEnter();
            _state = this;
            top.postMessage({surfingkeys_uihost_data: {
                action: 'setFrontFrame',
                pointerEvents: pointerEvents,
                frameHeight: frameHeight
            }}, self.topOrigin);
        };
        this.nextState = function () {
            var visibleDivs = Array.from(document.body.querySelectorAll("body>div")).filter(function(n) {
                return n.style.display !== "none";
            });
            var pointerEvents = visibleDivs.map(function(d) {
                var id = d.id;
                var divNoPointerEvents = ["sk_keystroke", "sk_banner"];
                if (divNoPointerEvents.indexOf(id) !== -1) {
                    // no pointerEvents for bubble
                    return false;
                } else if (id === "sk_status") {
                    // only pointerEvents when input in statusBar
                    return self.statusBar.querySelector('input') !== null;
                } else {
                    // with pointerEvents for all other DIVs except that noPointerEvents is set.
                    return !d.noPointerEvents;
                }
            });
            // to make pointerEvents not empty
            pointerEvents.push(false);
            pointerEvents = pointerEvents.reduce(function(a, b) {
                return a || b;
            });

            var ns;
            if (pointerEvents) {
                ns = stateInteractive;
            } else if (visibleDivs.length > 0) {
                ns = stateVisible;
            } else {
                ns = stateInvisible;
            }
            if (this !== ns) {
                ns.enter();
            }
        };
    }
    const stateInvisible = new State("none", "0px");
    const stateVisible = new State("none", "100%");
    const stateInteractive = new State("all", "100%", function() {
        window.focus();
    });
    _state = stateInvisible;

    self.flush = function() {
        _state.nextState();
    };
    self.visualCommand = function(args) {
        if (_usage.style.display !== "none") {
            // visual mode in frontend.html, such as help
            visual[args.action](args.query);
        } else {
            // visual mode for all content windows
            self.contentCommand(args);
        }
    };

    const _omnibar = document.getElementById('sk_omnibar');
    self.statusBar = document.getElementById('sk_status');
    const _usage = document.getElementById('sk_usage');
    const _popup = document.getElementById('sk_popup');
    const _editor = document.getElementById('sk_editor');
    const _nvim = document.getElementById('sk_nvim');
    const _tabs = document.getElementById('sk_tabs');
    const _banner = document.getElementById('sk_banner');
    const _bubble = document.getElementById('sk_bubble');
    const sk_bubble_content = _bubble.querySelector("div.sk_bubble_content");
    const sk_bubble_arrow = _bubble.querySelector('div.sk_arrow');
    const sk_bubbleClassList = sk_bubble_content.classList;
    function clearScrollerIndicator() {
        sk_bubbleClassList.remove("sk_scroller_indicator_top");
        sk_bubbleClassList.remove("sk_scroller_indicator_middle");
        sk_bubbleClassList.remove("sk_scroller_indicator_bottom");
    }
    sk_bubble_content.onscroll = function(evt) {
        clearScrollerIndicator();
        if (this.scrollTop === 0) {
            sk_bubbleClassList.add("sk_scroller_indicator_top");
        } else if (this.scrollTop + this.offsetHeight >= this.scrollHeight) {
            sk_bubbleClassList.add("sk_scroller_indicator_bottom");
        } else {
            sk_bubbleClassList.add("sk_scroller_indicator_middle");
        }
    };
    var keystroke = document.getElementById('sk_keystroke');

    self.startInputGuard = () => {
        if (getBrowserName().startsWith("Safari")) {
            var inputGuard = setInterval(() => {
                let input = null;
                for (const a of document.querySelectorAll("input, textarea")) {
                    if (a.getBoundingClientRect().width) {
                        input = a;
                        break;
                    }
                }
                if (input && document.activeElement !== input) {
                    input.focus();
                    input.value = " "
                    setTimeout(() => {
                        input.value = ""
                    }, 10);
                } else {
                    clearInterval(inputGuard);
                }
            }, 100);
        }
    };
    _actions['hidePopup'] = function() {
        if (_display && _display.style.display !== "none") {
            _display.style.display = "none";
            self.flush();
            _display.onHide && _display.onHide();
            self.exit();
        }
    };
    self.hidePopup = _actions['hidePopup'];

    function setDisplay(td, render) {
        if (_display && _display.style.display !== "none") {
            _display.style.display = "none";
            _display.onHide && _display.onHide();
        }
        _display = td;
        _display.style.display = "";
        render && render();
        self.startInputGuard();
    }

    function showElement(td, render, onHit) {
        self.enter(0, true);
        td.onHit = onHit;
        setDisplay(td, render);
        self.flush();
    }

    function renderTabTitles(container, tabs) {
        tabs.forEach(function(t, i) {
            const tab = createElementWithContent('div', `<div class=sk_tab_wrap><div class=sk_tab_icon><img/></div><div class=sk_tab_title>${htmlEncode(t.title)}</div></div>`, { "class": 'sk_tab' });
            if (t.active) {
                tab.classList.add("active");
            }
            attachFaviconToImgSrc(t, tab.querySelector("img"));
            container.append(tab);
        });
    }
    function renderTabs(container, tabs) {
        setSanitizedContent(container, "");
        var hintLabels = hints.genLabels(tabs.length - 1);
        const unitWidth = window.innerWidth / tabs.length - 2;
        const verticalTabs = runtime.conf.verticalTabs;
        container.className = verticalTabs ? "vertical" : "horizontal";
        renderTabTitles(container, tabs);
        if (verticalTabs) {
            container.querySelectorAll("div.sk_tab").forEach((tab) => {
                tab.append(createElementWithContent('div', '🚀', {class: "tab_rocket"}));
            });
        } else {
            container.querySelectorAll("div.sk_tab").forEach((tab) => {
                tab.querySelector("div.sk_tab_title").style.width = (unitWidth - 24) + 'px';
                tab.style.width = unitWidth + 'px';
            });
        }
        const tabsNeedHint = tabs.filter((t) => !t.active);
        container.querySelectorAll("div.sk_tab:not(.active)").forEach((tab, i) => {
            const tabHint = createElementWithContent('div', hintLabels[i], { "class": 'sk_tab_hint' });
            const tabData = tabsNeedHint[i];
            tabHint.label = hintLabels[i];
            tabHint.link = {id: tabData.id, windowId: tabData.windowId};
            tab.prepend(tabHint);
        });
        if (container.getBoundingClientRect().height > self.topSize[1]) {
            container.className = "inline";
        }
    }
    _actions['chooseTab'] = function() {
        const tabsThreshold = Math.min(runtime.conf.tabsThreshold, Math.ceil(window.innerWidth / 26));
        RUNTIME('getTabs', {queryInfo: {currentWindow: true}, tabsThreshold}, function(response) {
            if (response.tabs.length > tabsThreshold) {
                showElement(_omnibar, () => {
                    _omnibar.onShow({type: 'Tabs'});
                });
            } else if (response.tabs.length > 0) {
                showElement(_tabs, () => {
                    renderTabs(_tabs, response.tabs);
                }, (matched) => {
                    RUNTIME('focusTab', {
                        windowId: matched.windowId,
                        tabId: matched.id
                    });
                });
            }
        });
    };
    self.chooseTab = _actions['chooseTab'];
    _actions['groupTab'] = function() {
        RUNTIME('getTabGroups', {}, function(response) {
            const groups = response.groups;
            if (groups.length === 0) {
                self.openOmnibar({type: "Commands", pref: "createTabGroup"});
                return;
            }

            showElement(_tabs, () => {
                setSanitizedContent(_tabs, "");
                _tabs.className = "";
                const hintLabels = hints.genLabels(groups.length*2 + 1);
                groups.forEach(function(g, i) {
                    const group = document.createElement('div');
                    group.setAttribute('class', 'sk_tab_group');
                    const labels = [hintLabels[2*i],hintLabels[2*i + 1]];
                    setSanitizedContent(group, `<div class=sk_tab_group_header><div><div class=sk_tab_hint>${labels[0]}</div><span class=sk_tab_group_title></span></div><div><div class=sk_tab_hint>${labels[1]}</div><span class=sk_tab_group_state></span></div></div><div class=sk_tab_group_details></div>`);
                    renderTabTitles(group.querySelector("div.sk_tab_group_details"), g.tabs);
                    const activeState = g.active ? '☑' : '☐';
                    setSanitizedContent(group.querySelector("span.sk_tab_group_title"), activeState + htmlEncode(g.title));
                    const collapsedState = g.collapsed ? '☑' : '☐';
                    setSanitizedContent(group.querySelector("span.sk_tab_group_state"), collapsedState + "Collapsed");
                    const tabHints = group.querySelectorAll("div.sk_tab_hint");
                    tabHints[0].label = labels[0];
                    tabHints[0].link = {id: g.id, active: g.active, action: "group"};
                    tabHints[1].label = labels[1];
                    tabHints[1].link = {id: g.id, collapsed: g.collapsed, action: "collapse"};
                    _tabs.append(group);
                });
                const newTabGroup = createElementWithContent('div', `<div class=sk_tab_hint>${hintLabels[groups.length*2]}</div> New tab group`, { "class": 'sk_tab_group' });
                const tabHint = newTabGroup.querySelector("div.sk_tab_hint");
                tabHint.label = hintLabels[groups.length*2];
                tabHint.link = {action: "new"};
                _tabs.append(newTabGroup);
            }, (matched) => {
                if (matched.action === "collapse") {
                    RUNTIME('collapseGroup', {groupId: matched.id, collapsed: !matched.collapsed});
                } else if (matched.action === "new") {
                    setTimeout(() => {
                        self.openOmnibar({type: "Commands", pref: "createTabGroup"});
                    }, 10);
                } else {
                    if (matched.active) {
                        RUNTIME('ungroupTab');
                    } else {
                        RUNTIME('createTabGroup', {groupId: matched.id});
                    }
                }
            });
        });
    };

    function localizeAnnotation(locale, annotation) {
        if (annotation.constructor.name === "Array") {
            const fmt = annotation[0];
            return locale(fmt).format(...annotation.slice(1));
        } else {
            return locale(annotation);
        }
    }

    function buildUsage(metas, cb) {
        var feature_groups = [
            'Help',                  // 0
            'Mouse Click',           // 1
            'Scroll Page / Element', // 2
            'Tabs',                  // 3
            'Page Navigation',       // 4
            'Sessions',              // 5
            'Search selected with',  // 6
            'Clipboard',             // 7
            'Omnibar',               // 8
            'Visual Mode',           // 9
            'vim-like marks',        // 10
            'Settings',              // 11
            'Chrome URLs',           // 12
            'Proxy',                 // 13
            'Misc',                  // 14
            'Insert Mode',           // 15
            'Lurk Mode',             // 16
            'Regional Hints Mode',   // 17
        ];

        initL10n(function(locale) {
            var help_groups = feature_groups.map(function(){return [];});
            const lh = Mode.specialKeys["<Alt-s>"].length;
            if (lh > 0) {
                help_groups[0].push("<div><span class=kbd-span><kbd>{0}</kbd></span><span class=annotation>{1}</span></div>".format(
                    htmlEncode(Mode.specialKeys["<Alt-s>"][lh - 1]), locale("Toggle SurfingKeys on current site")));
            }

            metas = metas.concat(getAnnotations(omnibar.mappings));
            metas.forEach(function(meta) {
                const w = KeyboardUtils.decodeKeystroke(meta.word);
                const annotation = localizeAnnotation(locale, meta.annotation);
                const item = `<div><span class=kbd-span><kbd>${htmlEncode(w)}</kbd></span><span class=annotation>${annotation}</span></div>`;
                help_groups[meta.feature_group].push(item);
            });
            help_groups = help_groups.map(function(g, i) {
                if (g.length) {
                    return "<div><div class=feature_name><span>{0}</span></div>{1}</div>".format(locale(feature_groups[i]), g.join(''));
                } else {
                    return "";
                }
            }).join("");

            help_groups += `<p style='float:right; width:100%; text-align:right'><a href='https://github.com/brookhong/surfingkeys' target='_blank' style='color:#0095dd'>${locale("More help")}</a></p>`;
            cb(help_groups);
        });
    }

    _actions['showUsage'] = function(message) {
        showElement(_usage, () => {
            buildUsage(message.metas, function(usage) {
                setSanitizedContent(_usage, usage);
            });
        });
    };
    _actions['applyUserSettings'] = function (message) {
        for (var k in message.userSettings) {
            if (runtime.conf.hasOwnProperty(k)) {
                runtime.conf[k] = message.userSettings[k];
            }
        }
        if ('theme' in message.userSettings) {
            setSanitizedContent(document.getElementById("sk_theme"), message.userSettings.theme);
        }
    };
    _actions['addMapkey'] = function (message) {
        if (message.old_keystroke in Mode.specialKeys) {
            Mode.specialKeys[message.old_keystroke].push(message.new_keystroke);
        } else if (modes.hasOwnProperty(message.mode)) {
            mapInMode(modes[message.mode], message.new_keystroke, message.old_keystroke);
        }
    };
    _actions['addVimMap'] = function (message) {
        self.vimMappings.push([message.lhs, message.rhs, message.ctx]);
    };
    _actions['addVimKeyMap'] = function (message) {
        self.vimKeyMap = message.vimKeyMap;
    };
    _actions['addCommand'] = function(message) {
        const proxyAction = (...args) => {
            self.contentCommand({
                action: 'executeUserCommand',
                name: message.name,
                args: args
            });
        };
        omnibar.command(message.name, message.description, proxyAction);
    };
    _actions['getUsage'] = function (message) {
        // send response in callback from buildUsage
        delete message.ack;
        buildUsage(message.metas, function(usage) {
            top.postMessage({surfingkeys_uihost_data: {
                data: usage,
                toContent: true,
                id: message.id
            }}, self.topOrigin);
        });
    };

    self.showUsage = self.hidePopup;

    function showPopup(content) {
        setSanitizedContent(_popup, content);
        showElement(_popup);
    }

    _actions['showPopup'] = function(message) {
        showPopup(message.content);
    };

    _actions['showDialog'] = function(message) {
        showElement(_popup, () => {
            const hintLabels = hints.genLabels(2);
            setSanitizedContent(_popup, `<div>${message.question}</div><div><div class=sk_tab_hint>${hintLabels[0]}</div><span class=sk_tab_group_title>Ok</span><div class=sk_tab_hint>${hintLabels[1]}</div><span class=sk_tab_group_title>Cancel</span></div>`);
            const tabHints = _popup.querySelectorAll("div.sk_tab_hint");
            _popup.style.textAlign = "center";
            tabHints[0].link = "Ok";
            tabHints[0].label = hintLabels[0];
            tabHints[1].link = "Cancel";
            tabHints[1].label = hintLabels[1];
        }, (matched) => {
            self.contentCommand({
                action: 'dialogResponse',
                result: matched
            });
        });
    };

    self.vimMappings = [];
    let _aceEditor = null;
    function renderAceEditor(message) {
        if (!_aceEditor) {
            _aceEditor = new Promise((resolve, reject) => {
                import(/* webpackIgnore: true */ './ace.js').then(() => {
                    resolve(createAceEditor(normal, self));
                });
            });
        }
        _aceEditor.then((editor) => {
            editor.show(message);
        });
    }
    let _neovim = null;
    function renderNvim(message) {
        if (!_neovim) {
            _neovim  = new Promise((resolve, reject) => {
                import(/* webpackIgnore: true */ './neovim_lib.js').then((nvimlib) => {
                    nvimlib.default(_nvim).then(({nvim, destroy}) => {
                        function quitNvim() {
                            normal.enter();
                            destroy();
                            self.hidePopup();
                        }
                        function rpc(data) {
                            const [ event, args ] = data;
                            if (event === "WriteData") {
                                self.contentCommand({
                                    action: 'ace_editor_saved',
                                    data: args[0].join("\r")
                                });
                                quitNvim();
                            }
                        }
                        nvim.on('nvim:open', () => {
                            nvim.on('surfingkeys:rpc', rpc);
                        });
                        nvim.on('nvim:close', () => {
                            nvim.off('surfingkeys:rpc', rpc);
                            quitNvim();
                        });
                        resolve(nvim);
                    });
                });
            });
        }
        _neovim.then((nvim) => {
            normal.exit();
            RUNTIME('connectNative', {mode: "embed"}, (resp) => {
                nvim.connect(resp.url, () => {
                    nvim.command(`call NewScratch("${message.file_name}", "${encode(message.content)}", "${message.type}")`);
                });
            });
        });
    }
    _actions['showEditor'] = function(message) {
        if (message.onEditorSaved) {
            self.onEditorSaved = message.onEditorSaved;
        }
        if (message.file_name) {
            showElement(_nvim, () => {
                renderNvim(message);
            });
        } else {
            showElement(_editor, () => {
                renderAceEditor(message);
            });
        }
    };
    self.showEditor = _actions['showEditor'];
    _actions['openOmnibar'] = function(message) {
        showElement(_omnibar, () => {
            _omnibar.onShow(message);
            const style = message.style || "";
            setSanitizedContent(_omnibar.querySelector('style'), `#sk_omnibar {${style}}`);
        });
    };
    self.openOmnibar = _actions['openOmnibar'];
    _actions['openFinder'] = function() {
        Find.open();
    };

    function showBanner(content, linger_time) {
        _banner.style.cssText = "";
        _banner.style.display = "";
        _banner.style.top = "0px";
        setSanitizedContent(_banner, htmlEncode(content));
        self.flush();

        let timems = linger_time || 1600;
        setTimeout(function() {
            _banner.style.cssText = "";
            _banner.style.display = "none";
            self.flush();
        }, timems);
    }
    _actions['showBanner'] = function(message) {
        showBanner(message.content, message.linger_time);
    };
    _actions['showBubble'] = function(message) {
        var pos = message.position;
        pos.left += pos.winX;
        pos.top += pos.winY;
        // set position to (0, 0) to leave enough space for content.
        _bubble.style.top = "0px";
        _bubble.style.left = "0px";
        setSanitizedContent(sk_bubble_content, message.content);
        sk_bubble_content.style.maxWidth = (pos.winWidth - 32) + "px";
        sk_bubble_content.scrollTop = 0;
        clearScrollerIndicator();
        _bubble.style.display = "";
        var w = _bubble.offsetWidth,
            h = _bubble.offsetHeight;
        var left = [pos.left - 11 - w / 2, w / 2];
        if (left[0] < pos.winX) {
            left[1] += left[0] - pos.winX;
            left[0] = pos.winX;
        } else if ((left[0] + w) > pos.winWidth) {
            left[1] += left[0] - pos.winX - pos.winWidth + w;
            left[0] = pos.winX + pos.winWidth - w;
        }
        sk_bubble_arrow.style.left = (left[1] + pos.width / 2 - 2) + "px";
        _bubble.style.left = left[0] + "px";
        _bubble.noPointerEvents = message.noPointerEvents;

        if (pos.top + pos.height / 2 > pos.winHeight / 2) {
            sk_bubble_arrow.setAttribute("dir", "down");
            sk_bubble_arrow.style.top = "100%";
            sk_bubble_content.style.maxHeight = (pos.top - 12 - 32) + "px";
            h = _bubble.offsetHeight;
            _bubble.style.top = (pos.top - h - 12) + "px";
        } else {
            sk_bubble_arrow.setAttribute("dir", "up");
            sk_bubble_arrow.style.top = "-12px";
            sk_bubble_content.style.maxHeight = (pos.winHeight - (pos.top + pos.height + 12) - 32) + "px";
            h = _bubble.offsetHeight;
            _bubble.style.top = pos.top + pos.height + 12 + "px";
        }
        if (sk_bubble_content.scrollHeight > sk_bubble_content.offsetHeight) {
            _bubble.noPointerEvents = false;
            sk_bubbleClassList.add("sk_scroller_indicator_top");
        }
        self.flush();
        if (!_bubble.noPointerEvents) {
            setDisplay(_bubble, {});
            self.enter(0, true);
        }
    };

    _actions['hideBubble'] = function() {
        _bubble.style.display = "none";
        self.flush();
    };

    _actions['visualUpdated'] = function(message) {
        self.statusBar.querySelector('input').focus();
    };

    _actions['showStatus'] = function(message) {
        StatusBar.show(message.contents, message.duration);
    };

    initSKFunctionListener("front", {
        showPopup,
        showBanner,
        openFinder: () => {
            Find.open();
        },
        showStatus: (contents, duration) => {
            StatusBar.show(contents, duration);
        },
    });

    self.toggleStatus = function(visible) {
        if (visible) {
            self.statusBar.style.display = "";
        } else {
            self.statusBar.style.display = "none";
        }
    };
    _actions['toggleStatus'] = function(message) {
        self.toggleStatus(message.visible);
    };

    var _pendingHint;
    function clearPendingHint() {
        if (_pendingHint) {
            clearTimeout(_pendingHint);
            _pendingHint = undefined;
        }
    }

    _actions['hideKeystroke'] = function() {
        if (keystroke.style.display !== "none") {
            keystroke.classList.remove("expandRichHints");
            setSanitizedContent(keystroke, "");
            keystroke.style.display = "none";
            self.flush();
        }
        if (runtime.conf.richHintsForKeystroke > 0 && runtime.conf.richHintsForKeystroke < 10000) {
            clearPendingHint();
        }
    };

    function showRichHints(keyHints) {
        initL10n(function (locale) {
            var words = keyHints.accumulated;
            var cc = keyHints.candidates;
            words = Object.keys(cc).sort().map(function (w) {
                const annotation = localizeAnnotation(locale, cc[w].annotation);
                if (annotation) {
                    const nextKey = w.substr(keyHints.accumulated.length);
                    return `<div><span class=kbd-span><kbd>${htmlEncode(KeyboardUtils.decodeKeystroke(keyHints.accumulated))}<span class=candidates>${htmlEncode(KeyboardUtils.decodeKeystroke(nextKey))}</span></kbd></span><span class=annotation>${annotation}</span></div>`;
                } else {
                    return "";
                }
            }).join("");
            if (words.length > 0 && _pendingHint) {
                setSanitizedContent(keystroke, words);
                keystroke.classList.add("expandRichHints");
                self.flush();
            }
        });
    }
    _actions['showKeystroke'] = function (message) {
        if (keystroke.style.display !== "none" && keystroke.classList.contains("expandRichHints")) {
            showRichHints(message.keyHints);
        } else {
            clearPendingHint();
            keystroke.style.display = "";
            self.flush();
            var keys = keystroke.innerHTML + htmlEncode(KeyboardUtils.decodeKeystroke(message.keyHints.key));
            setSanitizedContent(keystroke, keys);

            if (runtime.conf.richHintsForKeystroke > 0 && runtime.conf.richHintsForKeystroke < 10000) {
                _pendingHint = setTimeout(function() {
                    showRichHints(message.keyHints);
                }, runtime.conf.richHintsForKeystroke);
            }
        }
    };

    _actions['initFrontend'] = function(message) {
        self.topOrigin = message.origin;
        self.topSize = message.winSize;
        return new Date().getTime();
    };

    window.addEventListener('message', function(event) {
        var _message = event.data && event.data.surfingkeys_frontend_data;
        if (_message === undefined) {
            return;
        }
        if (_callbacks[_message.id]) {
            var f = _callbacks[_message.id];
            // returns true to make callback stay for coming response.
            if (!f(_message)) {
                delete _callbacks[_message.id];
            }
        } else if (_message.action && _actions.hasOwnProperty(_message.action)) {
            var ret = _actions[_message.action](_message);
            if (_message.ack) {
                top.postMessage({surfingkeys_uihost_data: {
                    data: ret,
                    action: _message.action + "Ack",
                    toContent: true,
                }}, self.topOrigin);
            }
        }
    }, true);


    function onResize() {
        if (_bubble.style.display !== "none") {
            self.contentCommand({
                action: 'updateInlineQuery'
            });
        }
    }

    // for mouseSelectToQuery
    document.onmouseup = function(e) {
        if (!_bubble.contains(e.target)) {
            _bubble.style.display = "none";
            self.flush();
            self.contentCommand({
                action: 'emptySelection'
            });
            window.removeEventListener("resize", onResize);
        } else {
            var sel = window.getSelection().toString().trim() || getWordUnderCursor(true);
            if (sel && sel.length > 0) {
                self.contentCommand({
                    action: 'updateInlineQuery',
                    word: sel
                }, function() {
                    window.addEventListener("resize", onResize);
                });
            }
        }
    };

    _bubble.querySelector("div.sk_bubble_content").addEventListener("mousewheel", function (evt) {
        if (evt.deltaY > 0 && this.scrollTop + this.offsetHeight >= this.scrollHeight || evt.deltaY < 0 && this.scrollTop <= 0) {
            evt.preventDefault();
        }
    }, { passive: false });

    return self;
})();

/**
 * The status bar displays the status of Surfingkeys current mode: Normal, visual, etc.
 *
 * @kind function
 *
 * @param {Object} ui
 * @return {StatusBar} StatusBar instance
 */
var StatusBar = (function() {
    var self = {};
    var timerHide = null;
    var ui = Front.statusBar;

    // 4 spans
    // mode: 0
    // search: 1
    // searchResult: 2
    // proxy: 3
    self.show = function(contents, duration) {
        if (timerHide) {
            clearTimeout(timerHide);
            timerHide = null;
        }
        var span = ui.querySelectorAll('span');
        for (var i = 0; i < contents.length; i++) {
            if (contents[i] !== undefined) {
                setSanitizedContent(span[i], contents[i]);
            }
        }
        var lastSpan = -1;
        for (var i = 0; i < span.length; i++) {
            if (span[i].innerHTML.length) {
                lastSpan = i;
                span[i].style.padding = "0px 8px";
                span[i].style.borderRight = "1px solid #999";
            } else {
                span[i].style.padding = "";
                span[i].style.borderRight = "";
            }
        }
        if (lastSpan === -1) {
            ui.style.display = 'none';
        } else {
            span[lastSpan].style.borderRight = "";
            ui.style.display = 'block';
        }
        Front.flush();
        if (duration) {
            timerHide = setTimeout(function() {
                self.show(["", "", "", ""]);
            }, duration);
        }
    };
    return self;
})();

var Find = (function() {
    var self = new Mode("Find", "/");

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
    }).addEventListener('mousedown', function(event) {
        if (event.target !== input) {
            // user clicks on somewhere else
            reset();
        }
        event.sk_suppressed = true;
    });

    let input;
    let historyInc = 0;
    let userInput = "";
    function reset() {
        input = null;
        StatusBar.show(["", ""]);
        self.exit();
    }

    /**
     * Opens the status bar
     *
     * @memberof StatusBar
     * @instance
     *
     * @return {undefined}
     */
    self.open = function() {
        StatusBar.show(["/", '<input id="sk_find" class="sk_theme"/>']);
        input = Front.statusBar.querySelector("input");
        if (!getBrowserName().startsWith("Safari")) {
            input.oninput = function() {
                if (input.value.length && input.value !== ".") {
                    Front.visualCommand({
                        action: 'visualUpdate',
                        query: input.value
                    });
                    // To find in usage popup will set focus and selection elsewhere
                    // we need bring it back
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                }
            };
        }
        var findHistory = [];
        RUNTIME('getSettings', {
            key: 'findHistory'
        }, function(response) {
            userInput = "";
            findHistory = response.settings.findHistory;
            historyInc = findHistory.length;
        });
        input.onkeydown = function(event) {
            if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
                reset();
                Front.visualCommand({
                    action: 'visualClear'
                });
            } else if (event.keyCode === KeyboardUtils.keyCodes.enter) {
                var query = input.value;
                if (query.length && query !== ".") {
                    if (event.ctrlKey) {
                        query = '\\b' + query + '\\b';
                    }
                    reset();
                    RUNTIME('updateInputHistory', { find: query });
                    Front.visualCommand({
                        action: 'visualEnter',
                        query: query
                    });
                }
            } else if (event.keyCode === KeyboardUtils.keyCodes.upArrow || event.keyCode === KeyboardUtils.keyCodes.downArrow) {
                if (findHistory.length) {
                    [input.value, historyInc] = rotateInput(findHistory, (event.keyCode === KeyboardUtils.keyCodes.downArrow), historyInc, userInput);
                    Front.visualCommand({
                        action: 'visualUpdate',
                        query: query
                    });
                    event.preventDefault();
                }
            } else {
                userInput = input.value;
                historyInc = findHistory.length;
            }
        };
        input.focus();
        Front.startInputGuard();
        self.enter();
    };
    return self;
})();

function createAceEditor(normal, front) {
    var self = new Mode("AceEditor");
    document.getElementById("sk_editor").style.height = "30%";
    var _ace = ace.edit('sk_editor');

    var originValue;
    function isDirty() {
        return _ace.getValue() != originValue;
    }

    var dialog = (function() {
        return {
            open: function(template, onEnter, options) {
                const passThrough = normal.passThrough();
                var _onClose = options.onClose;
                options.onClose = function() {
                    passThrough.exit();
                    _onClose && _onClose();
                };
                _ace.state.cm.openDialog(template, function(q) {
                    onEnter(q);
                    options.onClose();
                }, options);
            }
        };
    })();

    function _close() {
        document.activeElement.blur();
        front.hidePopup();
    }

    function _save() {
        var data = _getValue();
        if (front.onEditorSaved) {
            front.onEditorSaved(data);
            front.onEditorSaved = undefined;
        } else {
            front.contentCommand({
                action: 'ace_editor_saved',
                data: data
            });
        }
    }

    function _closeAndSave() {
        _close();
        _save();
    }

    self.addEventListener('keydown', function(event) {
        event.sk_suppressed = true;
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)
            && (!_ace.completer || !_ace.completer.activated) // and completion popup not opened
        ) {
            if (runtime.conf.aceKeybindings === "emacs") {
                self.onExit = _close;
                self.exit();
            } else if (_ace.state.cm.mode === 'normal' // vim in normal mode
                && !_ace.state.cm.state.vim.status // and no pending normal operation
            ){
                if (isDirty()) {
                    dialog.open('<span style="font-family: monospace">Quit anyway? Y/n </span><input type="text"/>', function(q) {
                        if (q.toLowerCase() === 'y') {
                            self.onExit = _close;
                            self.exit();
                        }
                    }, {
                        bottom: true,
                        value: "Y",
                        onKeyDown: function(e, q, close) {
                            if (e.keyCode === KeyboardUtils.keyCodes.enter || e.keyCode === KeyboardUtils.keyCodes.ESC) {
                                close();
                            }
                        }
                    });
                } else {
                    self.onExit = _close;
                    self.exit();
                }
            }
        }
    });

    function createUrlCompleter() {
        var allVisitedURLs;
        RUNTIME('getAllURLs', null, function(response) {
            allVisitedURLs = response.urls.map(function(u) {
                var typedCount = 0, visitCount = 1;
                if (u.hasOwnProperty('typedCount')) {
                    typedCount = u.typedCount;
                }
                if (u.hasOwnProperty('visitCount')) {
                    visitCount = u.visitCount;
                }
                return {
                    caption: u.url,
                    value: u.url,
                    score: typedCount*10 + visitCount,
                    meta: 'local'
                };
            });
        });
        return {
            identifierRegexps: [/.*/],
            getCompletions: function(editor, session, pos, prefix, callback) {
                callback(null, allVisitedURLs);
            }
        };
    }

    var wordsOnPage = null;
    function getWordsOnPage(message) {
        var splitRegex = /[^a-zA-Z_0-9\$\-\u00C0-\u1FFF\u2C00-\uD7FF\w]+/;
        var words = message.split(splitRegex);
        var wordScores = {};
        words.forEach(function(word) {
            word = "sk_" + word;
            if (wordScores.hasOwnProperty(word)) {
                wordScores[word]++;
            } else {
                wordScores[word] = 1;
            }
        });

        return Object.keys(wordScores).map(function(w) {
            w = w.substr(3);
            return {
                caption: w,
                value: w,
                score: wordScores[w],
                meta: 'local'
            };
        });
    };

    var pageWordCompleter = {
        getCompletions: function(editor, session, pos, prefix, callback) {
            if (!wordsOnPage) {
                front.contentCommand({
                    action: 'getPageText'
                }, function(message) {
                    wordsOnPage = getWordsOnPage(message.data);
                    callback(null, wordsOnPage);
                });
            } else {
                callback(null, wordsOnPage);
            }
        }
    };

    ace.config.loadModule('ace/ext/language_tools', function (mod) {
        _ace.language_tools = mod;
        ace.config.loadModule('ace/autocomplete', function (mod) {
            mod.Autocomplete.startCommand.bindKey = "Tab";
            mod.Autocomplete.prototype.commands['Space'] = mod.Autocomplete.prototype.commands['Tab'];
            mod.Autocomplete.prototype.commands['Tab'] = mod.Autocomplete.prototype.commands['Down'];
            mod.Autocomplete.prototype.commands['Shift-Tab'] = mod.Autocomplete.prototype.commands['Up'];
            mod.FilteredList.prototype.filterCompletions = function(items, needle) {
                var results = [];
                var upper = needle.toUpperCase();
                loop: for (var i = 0, item; item = items[i]; i++) {
                    var caption = item.value.toUpperCase();
                    if (!caption) continue;
                    var index = caption.indexOf(upper), matchMask = 0;

                    if (index === -1)
                        continue loop;
                    matchMask = matchMask | (Math.pow(2, needle.length) - 1 << index);
                    item.matchMask = matchMask;
                    item.exactMatch = 0;
                    results.push(item);
                }
                return results;
            };
        });
        _ace.setOptions({
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: false,
            enableSnippets: false
        });
    });

    var _editorType;
    function _getValue() {
        var val = _ace.getValue();
        if (_editorType === 'select') {
            // get current line
            val = _ace.session.getLine(_ace.selection.lead.row);
            val = val.match(/.*>< ([^<]*)$/);
            val = val ? val[1] : "";
        }
        return val;
    }
    function aceKeyboardVimLoaded() {
        var cm = _ace.state.cm;
        cm.mode = "normal";
        cm.on('vim-mode-change', function(data) {
            cm.mode = data.mode;
        });
        cm.on('0-register-set', function(data) {
            var lf = document.activeElement;
            Clipboard.write(data.text);
            lf.focus();
        });
        var vim = cm.constructor.Vim;
        vim.defineEx("write", "w", function(cm, input) {
            _save();
        });
        const wq = function(cm, input) {
            self.onExit = _closeAndSave;
            self.exit();
            // tell vim editor that command is done
            _ace.state.cm.signal('vim-command-done', '');
        };
        vim.defineEx("wq", "wq", wq);
        vim.defineEx("x", "x", wq);
        vim.map('<CR>', ':wq<CR>', 'normal');
        vim.defineEx("bnext", "bn", function(cm, input) {
            front.contentCommand({
                action: 'nextEdit',
                backward: false
            });
        });
        vim.defineEx("bprevious", "bp", function(cm, input) {
            front.contentCommand({
                action: 'nextEdit',
                backward: true
            });
        });
        vim.defineEx("quit", "q", function(cm, input) {
            self.onExit = _close;
            self.exit();
            _ace.state.cm.signal('vim-command-done', '');
        });
        front.vimMappings.forEach(function(a) {
            vim.map.apply(vim, a);
        });
        var dk = _ace.getKeyboardHandler().defaultKeymap;
        if (front.vimKeyMap && front.vimKeyMap.length) {
            dk.unshift.apply(dk, front.vimKeyMap);
        }
        return vim;
    }
    function aceKeyboardEmacsLoaded() {
        _ace.$emacsModeHandler.addCommands({
            closeAndSave: {
                exec: function(editor) {
                    self.onExit = _closeAndSave;
                    self.exit();
                },
                readOnly: true
            }
        });
        _ace.$emacsModeHandler.bindKey("C-x C-s", "closeAndSave");
        return _ace.$emacsModeHandler;
    }
    _ace.setTheme("ace/theme/chrome");
    var keybindingsDeferred = new Promise(function(resolve, reject) {
        var aceKeyboardLoaded = aceKeyboardVimLoaded;
        if (runtime.conf.aceKeybindings === "emacs") {
            aceKeyboardLoaded = aceKeyboardEmacsLoaded;
        } else {
            runtime.conf.aceKeybindings = "vim";
        }
        _ace.setKeyboardHandler('ace/keyboard/' + runtime.conf.aceKeybindings, function() {
            resolve(aceKeyboardLoaded());
        });
    });
    _ace.container.style.background = "#f1f1f1";
    _ace.$blockScrolling = Infinity;

    self.show = function(message) {
        keybindingsDeferred.then(function(vim) {
            _ace.setValue(message.content, -1);
            originValue = message.content;
            _ace.container.querySelector('textarea').focus();
            self.enter();
            _editorType = message.type;
            _ace.setFontSize(16);

            if (vim.$id === "ace/keyboard/emacs") {
                if (message.type === 'url') {
                    _ace.setOption('showLineNumbers', false);
                    _ace.language_tools.setCompleters([createUrlCompleter()]);
                    _ace.container.style.height = "30%";
                } else if (message.type === 'input') {
                    _ace.setOption('showLineNumbers', false);
                    _ace.language_tools.setCompleters([pageWordCompleter]);
                    _ace.container.style.height = "";
                } else {
                    _ace.setOption('showLineNumbers', true);
                    _ace.language_tools.setCompleters([pageWordCompleter]);
                    _ace.container.style.height = "30%";
                }
                _ace.setReadOnly(message.type === 'select');

                // reset undo
                setTimeout( function () {
                    _ace.renderer.session.$undoManager.reset();
                }, 1);
            } else {
                vim.unmap('<CR>', 'insert');
                vim.unmap('<C-CR>', 'insert');
                if (message.type === 'url') {
                    vim.map('<CR>', '<Esc>:wq<CR>', 'insert');
                    _ace.setOption('showLineNumbers', false);
                    _ace.language_tools.setCompleters([createUrlCompleter()]);
                    _ace.container.style.height = "30%";
                } else if (message.type === 'input') {
                    vim.map('<CR>', '<Esc>:wq<CR>', 'insert');
                    _ace.setOption('showLineNumbers', false);
                    _ace.language_tools.setCompleters([pageWordCompleter]);
                    _ace.container.style.height = "16px";
                } else {
                    vim.map('<C-CR>', '<Esc>:wq<CR>', 'insert');
                    _ace.setOption('showLineNumbers', true);
                    _ace.language_tools.setCompleters([pageWordCompleter]);
                    _ace.container.style.height = "30%";
                }
                _ace.setReadOnly(message.type === 'select');
                vim.map('<C-d>', '<C-w>', 'insert');
                vim.exitInsertMode(_ace.state.cm);

                // set cursor at initial line
                _ace.state.cm.setCursor(message.initial_line, 0);
                _ace.state.cm.ace.renderer.scrollCursorIntoView();
                // reset undo
                setTimeout( function () {
                    _ace.renderer.session.$undoManager.reset();
                }, 1);

                _ace.state.cm.ace.setOption('indentedSoftWrap', false);
                _ace.state.cm.ace.setOption('wrap', true);
            }
        });
    };

    return self;
}

export default Front;
