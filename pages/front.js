var Front = (function(mode) {
    var self = $.extend({
        name: "Front",
        frontendOnly: true,
        eventListeners: {}
    }, mode);

    // this object is implementation of UI, it's UI provider
    self.isProvider = function() {
        return true;
    };

    var topOrigin,
        _actions = {},
        _callbacks = {};
    self.contentCommand = function(args, successById) {
        args.commandToContent = true;
        args.id = generateQuickGuid();
        if (successById) {
            args.ack = true;
            _callbacks[args.id] = successById;
        }
        top.postMessage(args, topOrigin);
    };

    self.addEventListener('keydown', function(event) {
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            self.hidePopup();
            event.sk_stopPropagation = true;
        } else {
            if (_tabs.trie) {
                _tabs.trie = _tabs.trie.find(event.sk_keyName);
                if (!_tabs.trie) {
                    self.hidePopup();
                    _tabs.trie = null;
                } else if (_tabs.trie.meta) {
                    RUNTIME('focusTab', {
                        tab_id: _tabs.trie.meta.id,
                        window_id: _tabs.trie.meta.windowId
                    });
                    self.hidePopup();
                    _tabs.trie = null;
                }
                event.sk_stopPropagation = true;
            }
        }
    });

    self.flush = function() {
        var visibleDivs = $('body>div:visible').toArray();
        var pointerEvents = visibleDivs.map(function(d) {
            var id = $(d).attr('id');
            var divNoPointerEvents = ["sk_keystroke", "sk_bubble", "sk_banner", "sk_frame"];
            if (divNoPointerEvents.indexOf(id) !== -1) {
                // no pointerEvents for bubble
                return false;
            } else if (id === "sk_status") {
                // only pointerEvents when input in statusBar
                return $('#sk_status').find('input').length > 0;
            } else {
                // with pointerEvents for all other DIVs
                return true;
            }
        });
        // to make pointerEvents not empty
        pointerEvents.push(false);
        pointerEvents = pointerEvents.reduce(function(a, b) {
            return a || b;
        });
        if (pointerEvents) {
            window.focus();
            visibleDivs[0].focus();
        }
        top.postMessage({
            action: 'setFrontFrame',
            pointerEvents: pointerEvents ? "all" : "none",
            frameHeight: visibleDivs.length > 0 ? "100%" : "0px"
        }, topOrigin);
    };
    self.visualCommand = function(args) {
        if (_usage.is(':visible')) {
            // visual mode in frontend.html
            Visual[args.action](args.query);
        } else {
            // visual mode for all content windows
            self.contentCommand(args);
        }
    };

    self.omnibar = $('#sk_omnibar').hide();
    self.statusBar = $('#sk_status').hide();
    var frameElement = $('<div id=sk_frame class=sk_theme>').appendTo('body').hide();
    var _usage = $('<div id=sk_usage class=sk_theme>').appendTo('body').hide();
    var _popup = $('<div id=sk_popup class=sk_theme>').appendTo('body').hide();
    var _editor = $('<div id=sk_editor>').appendTo('body').hide();
    var _tabs = $("<div id=sk_tabs></div>").appendTo('body').hide();
    var banner = $('<div id=sk_banner>').appendTo('body').hide();
    var _bubble = $("<div id=sk_bubble>").html("<div class=sk_bubble_content></div>").appendTo('body').hide();
    $("<div class=sk_arrow>").html("<div></div><div></div>").css('position', 'absolute').css('top', '100%').appendTo(_bubble);
    var keystroke = $('<div id=sk_keystroke class=sk_theme>').appendTo('body').hide();

    var _display;
    _actions['hidePopup'] = function() {
        if (_display && _display.is(':visible')) {
            _display.hide();
            self.flush();
            _display.onHide && _display.onHide();
            self.exit();
        }
    };
    self.hidePopup = _actions['hidePopup'];

    function showPopup(td, args) {
        self.enter(0, true);
        if (_display && _display.is(':visible')) {
            _display.hide();
            _display.onHide && _display.onHide();
        }
        _display = td;
        _display.show();
        _display.onShow && _display.onShow(args);
        self.flush();
    }

    _actions['highlightElement'] = function(message) {
        var rect = message.rect;
        frameElement.css('top', rect.top).css('left', rect.left).css('width', rect.width).css('height', rect.height).show();
        self.flush();
        setTimeout(function() {
            frameElement.hide();
            self.flush();
        }, message.duration);
    };

    _tabs.onShow = function(tabs) {
        _tabs.html("");
        _tabs.trie = new Trie();
        var hintLabels = Hints.genLabels(tabs.length);
        var tabstr = "<div class=sk_tab style='width: 200px'>";
        tabs.forEach(function(t, i) {
            var tab = $(tabstr);
            _tabs.trie.add(hintLabels[i].toLowerCase(), t);
            tab.html("<div class=sk_tab_hint>{0}</div><div class=sk_tab_wrap><div class=sk_tab_icon><img src='chrome://favicon/{1}'></div><div class=sk_tab_title>{2}</div></div>".format(hintLabels[i], t.url, $.htmlEncode(t.title)));
            tab.data('url', t.url);
            _tabs.append(tab);
        });
        _tabs.find('div.sk_tab').each(function() {
            $(this).append($("<div class=sk_tab_url>{0}</div>".format($(this).data('url'))));
        });
    };
    _actions['chooseTab'] = function() {
        runtime.command({
            action: 'getTabs'
        }, function(response) {
            if (response.tabs.length > runtime.conf.tabsThreshold) {
                showPopup(self.omnibar, {type: 'Tabs'});
            } else if (response.tabs.length > 0) {
                showPopup(_tabs, response.tabs);
            }
        });
    };

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
        ];
        var holder = $('<div/>');
        var help_groups = feature_groups.map(function(){return [];});

        initL10n(function(locale) {
            help_groups[0].push("<div><span class=kbd-span><kbd>&lt;Alt-s&gt;</kbd></span><span class=annotation>{0}</span></div>".format(locale("Toggle SurfingKeys on current site")));

            metas = metas.concat(getAnnotations(Omnibar.mappings));
            metas.forEach(function(meta) {
                var w = KeyboardUtils.decodeKeystroke(meta.word);
                var item = "<div><span class=kbd-span><kbd>{0}</kbd></span><span class=annotation>{1}</span></div>".format($.htmlEncode(w), locale(meta.annotation));
                help_groups[meta.feature_group].push(item);
            });
            help_groups = help_groups.map(function(g, i) {
                if (g.length) {
                    return "<div><div class=feature_name><span>{0}</span></div>{1}</div>".format(locale(feature_groups[i]), g.join(''));
                } else {
                    return "";
                }
            }).join("");
            $(help_groups).appendTo(holder);
            $("<p style='float:right; width:100%; text-align:right'>").html("<a href='https://github.com/brookhong/surfingkeys' target='_blank' style='color:#0095dd'>{0}</a>".format(locale("More help"))).appendTo(holder);
            cb(holder.html());
        });
    }

    _usage.onShow = function(message) {
        buildUsage(message.metas, function(usage) {
            _usage.html(usage);
        });
    };

    _actions['showUsage'] = function(message) {
        showPopup(_usage, message);
    };
    _actions['applyUserSettings'] = function (message) {
        for (var k in message.userSettings) {
            if (runtime.conf.hasOwnProperty(k)) {
                runtime.conf[k] = message.userSettings[k];
            }
        }
        if ('theme' in message.userSettings) {
            $('#sk_theme').html(message.userSettings.theme);
        }
    };
    _actions['executeCommand'] = function (message) {
        Commands.execute(message.cmdline);
    };
    _actions['addCMap'] = function (message) {
        _map(Omnibar, message.new_keystroke, message.old_keystroke);
    };
    _actions['addVimMap'] = function (message) {
        self.vimMappings.push([message.lhs, message.rhs, message.ctx]);
    };
    _actions['addVimKeyMap'] = function (message) {
        self.vimKeyMap = message.vimKeyMap;
    };
    _actions['addSearchAlias'] = function (message) {
        SearchEngine.aliases[message.alias] = {
            prompt: '' + message.prompt + separatorHtml,
            url: message.url,
            suggestionURL: message.suggestionURL
        };
    };
    _actions['removeSearchAlias'] = function (message) {
        delete SearchEngine.aliases[message.alias];
    };
    _actions['getUsage'] = function (message) {
        // send response in callback from buildUsage
        delete message.ack;
        buildUsage(message.metas, function(usage) {
            top.postMessage({
                data: usage,
                action: message.action + "Ack",
                responseToContent: message.commandToFrontend,
                id: message.id
            }, topOrigin);
        });
    };

    self.showUsage = self.hidePopup;

    _actions['showPopup'] = function(message) {
        self.showPopup(message.content);
    };

    self.showPopup = function(content) {
        _popup.html(content);
        showPopup(_popup);
    };

    self.vimMappings = [];
    _editor.onShow = function(message) {
        if (typeof(AceEditor) !== "undefined") {
            AceEditor.show(message);
        } else {
            Normal.insertJS('../libs/ace/ace.js', function() {
                ace.config.set('workerPath', "../libs/ace");
                ace.config.set('modePath', "../libs/ace");
                ace.config.set('themePath', "../libs/ace");
                ace.config.set('basePath', "../libs/ace");
                Normal.insertJS('editor.js', function() {
                    AceEditor.show(message);
                });
            });
        }
    };
    _actions['showEditor'] = function(message) {
        if (message.onEditorSaved) {
            self.onEditorSaved = message.onEditorSaved;
        }
        showPopup(_editor, message);
    };
    self.showEditor = _actions['showEditor'];
    _actions['updateOmnibarResult'] = function(message) {
        Omnibar.listWords(message.words);
    };
    _actions['openOmnibar'] = function(message) {
        showPopup(self.omnibar, message);
        var style = message.style || "";
        self.omnibar.find('style').html("#sk_omnibar {" + style + "}");
    };
    self.openOmnibar = _actions['openOmnibar'];
    _actions['openFinder'] = function() {
        Find.open();
    };
    self.openFinder = _actions['openFinder'];
    self.showBanner = function (content, linger_time) {
        banner.removeClass("slideInBanner").show();
        banner.html($.htmlEncode(content));
        self.flush();

        banner.addClass("slideInBanner").one('animationend', function () {
            banner.removeClass("slideInBanner").hide();
            self.flush();
        });
    };
    _actions['showBanner'] = function(message) {
        self.showBanner(message.content, message.linger_time);
    };
    _actions['showBubble'] = function(message) {
        var pos = message.position;
        _bubble.find('div.sk_bubble_content').html(message.content);
        _bubble.show();
        self.flush();
        var w = _bubble.width(),
            h = _bubble.height();
        var left = [pos.left - 11 - w / 2, w / 2];
        if (left[0] < 0) {
            left[1] += left[0];
            left[0] = 0;
        } else if ((left[0] + w) > window.innerWidth) {
            left[1] += left[0] - window.innerWidth + w;
            left[0] = window.innerWidth - w;
        }
        var arrow = _bubble.find('div.sk_arrow');
        if (pos.top - h - 12 >= 0) {
            arrow.attr('dir', 'down');
            arrow.css('top', '100%');
            _bubble.css('top', pos.top - h - pos.height - 12).css('left', left[0]);
        } else {
            arrow.attr('dir', 'up');
            arrow.css('top', -12);
            _bubble.css('top', pos.top + pos.height + 12).css('left', left[0]);
        }
        arrow.css('left', left[1]);
    };
    self.showBubble = function() {
    };

    _actions['hideBubble'] = function() {
        _bubble.hide();
        self.flush();
    };
    self.hideBubble = _actions['hideBubble'];

    _actions['visualUpdatedForFirefox'] = function(message) {
        Front.statusBar.find('input').focus();
    };

    _actions['showStatus'] = function(message) {
        if (Mode.stack()[0] !== Find) {
            self.showStatus(message.position, message.content, message.duration);
        }
    };
    self.showStatus = function(position, content, duration) {
        StatusBar.show(position, content, duration);
    };

    self.toggleStatus = function(visible) {
        if (visible) {
            self.statusBar.show();
        } else {
            self.statusBar.hide();
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
        if (keystroke.is(":visible")) {
            var outClass = keystroke.hasClass("expandRichHints") ? "collapseRichHints" : "slideOutRight";
            keystroke.removeClass("expandRichHints").addClass(outClass).one('animationend', function() {
                keystroke.html("");
                keystroke.hide();
                self.flush();
            });
        }
        if (runtime.conf.richHintsForKeystroke > 0 && runtime.conf.richHintsForKeystroke < 10000) {
            clearPendingHint();
        }
    };
    self.hideKeystroke = _actions['hideKeystroke'];
    Visual.mappings.add("y", {
        annotation: "Yank a word(w) or line(l) or sentence(s) or paragraph(p)",
        feature_group: 9
    });
    function showRichHints(keyHints) {
        initL10n(function (locale) {
            var words = keyHints.accumulated;
            var cc = keyHints.candidates;
            words = Object.keys(cc).sort().map(function (w) {
                var meta = cc[w];
                if (meta.annotation) {
                    return "<div><span class=kbd-span><kbd>{0}<span class=candidates>{1}</span></kbd></span><span class=annotation>{2}</span></div>".format($.htmlEncode(KeyboardUtils.decodeKeystroke(keyHints.accumulated)), w.substr(keyHints.accumulated.length), locale(meta.annotation));
                } else {
                    return "";
                }
            }).join("");
            if (words.length > 0 && _pendingHint) {
                keystroke.html(words);
                keystroke.removeClass("expandRichHints simpleHint").addClass("expandRichHints");
                self.flush();
            }
        });
    }
    _actions['showKeystroke'] = function (message) {
        if (keystroke.is(":visible") && keystroke.hasClass("expandRichHints")) {
            showRichHints(message.keyHints);
        } else {
            clearPendingHint();
            keystroke.show();
            self.flush();
            var keys = keystroke.html() + $.htmlEncode(KeyboardUtils.decodeKeystroke(message.keyHints.key));
            keystroke.html(keys);

            keystroke.removeClass("slideInRight slideOutRight collapseRichHints").addClass("slideInRight simpleHint");

            if (runtime.conf.richHintsForKeystroke > 0 && runtime.conf.richHintsForKeystroke < 10000) {
                _pendingHint = setTimeout(function() {
                    showRichHints(message.keyHints);
                }, runtime.conf.richHintsForKeystroke);
            }
        }
    };
    self.showKeystroke = function() {
    };

    _actions['initFrontend'] = function(message) {
        topOrigin = message.origin;
        return new Date().getTime();
    };

    window.addEventListener('message', function(event) {
        var _message = event.data;
        if (_callbacks[_message.id]) {
            var f = _callbacks[_message.id];
            // returns true to make callback stay for coming response.
            if (!f(_message)) {
                delete _callbacks[_message.id];
            }
        } else if (_message.action && _actions.hasOwnProperty(_message.action)) {
            var ret = _actions[_message.action](_message);
            if (_message.ack) {
                top.postMessage({
                    data: ret,
                    action: _message.action + "Ack",
                    responseToContent: _message.commandToFrontend,
                    id: _message.id
                }, topOrigin);
            }
        }
    }, true);

    return self;
})(Mode);
