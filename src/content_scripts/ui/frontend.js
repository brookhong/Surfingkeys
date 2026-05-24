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
    let destroyListeners = [];
    self.addDestroyListener = (task) => {
        destroyListeners.push(task);
    };
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
        const unitWidth = (window.innerWidth - 2) / tabs.length - 2;
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
		// Lolo: Don't delete any of these T-T
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
				console.log("Fish fucker");
				console.log(_usage);
				console.log(usage);
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
    _actions['setHintsCharacters'] = function (message) {
        hints.setCharacters(message.characters);
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
            setDisplay(_bubble);
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
    _actions['destroyFrontend'] = function(message) {
        if (_display && _display.style.display !== "none") {
            return false;
        }
        for (const task of destroyListeners) {
            task();
        }
        return true;
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

export default Front;
