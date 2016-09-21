var Front = (function(mode) {
    var self = $.extend({name: "Front", eventListeners: {}, ports: {}}, mode);

    // this object is implementation of UI, it's UI provider
    self.isProvider = function() {
        return true;
    };

    self.contentCommand = function(args, cb) {
        args.toContent = true;
        runtime.command(args, cb);
    };

    self.addEventListener('keydown', function(event) {
        var handled = "";
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            self.hidePopup();
            handled = "stopEventPropagation";
        } else {
            if (_tabs.trie) {
                _tabs.trie = _tabs.trie.find(event.sk_keyName);
                if (!_tabs.trie) {
                    self.hidePopup();
                    _tabs.trie = null;
                } else if (_tabs.trie.meta) {
                    RUNTIME('focusTab', {
                        tab_id: _tabs.trie.meta
                    });
                    self.hidePopup();
                    _tabs.trie = null;
                }
                handled = "stopEventPropagation";
            }
        }
        return handled;
    });

    self.postMessage = function(to, message) {
        self.ports[to].postMessage(message);
    };
    /*
     * set attributes of frame element in top window
     *      pointerEvents   whether the iframe can be target of mouse events
     *      hostBlur        whether to blur from the iframe
     *
     */
    self.flush = function(pointerEvents, hostBlur) {
        var height;
        if ($('body>div:visible').length > 0) {
            height = '100%';
        } else {
            height = '0px';
            // blur host anyway if height is 0px
            hostBlur = true;
        }
        self.postMessage('top', {
            action: 'setFrontFrame',
            pointerEvents: pointerEvents,
            hostBlur: hostBlur,
            frameHeight: height
        });
    };
    self.visualCommand = function(args) {
        if (_usage.is(':visible')) {
            // visual mode in frontend.html
            Visual[args.action](args.query);
        } else {
            // visual mode for all content windows
            Front.contentCommand(args);
        }
    };

    self.omnibar = $('#sk_omnibar').hide();
    self.statusBar = $('#sk_status').hide();
    var frameElement = $('<div id=sk_frame class=sk_theme>').appendTo('body').hide();
    var _usage = $('<div id=sk_usage class=sk_theme>').appendTo('body').hide();
    var _popup = $('<div id=sk_popup class=sk_theme>').appendTo('body').hide();
    var _editor = $('<div id=sk_editor>').appendTo('body').hide();
    var _tabs = $("<div class=sk_tabs><div class=sk_tabs_fg></div><div class=sk_tabs_bg></div></div>").appendTo('body').hide();
    var banner = $('<div id=sk_banner class=sk_theme>').appendTo('body').hide();
    var _bubble = $("<div class=sk_bubble>").html("<div class=sk_bubble_content></div>").appendTo('body').hide();
    $("<div class=sk_arrow>").html("<div class=sk_arrowdown></div><div class=sk_arrowdown_inner></div>").css('position', 'absolute').css('top', '100%').appendTo(_bubble);
    var keystroke = $('<div id=sk_keystroke class=sk_theme>').appendTo('body').hide();

    var _display;
    self.hidePopup = function() {
        if (_display && _display.is(':visible')) {
            _display.hide();
            self.flush("none", true);
            _display.onHide && _display.onHide();
            self.exit();
        }
    };
    function showPopup(td, args) {
        self.enter();
        if (_display && _display.is(':visible')) {
            _display.hide();
            _display.onHide && _display.onHide();
        }
        _display = td;
        _display.show();
        self.flush("all", false);
        _display.onShow && _display.onShow(args);
        if (_editor !== td) {
            // don't set focus for editor, as it may lead frontend.html hold focus.
            window.focus();
        }
    }

    self.highlightElement = function(message) {
        var rect = message.rect;
        frameElement.css('top', rect.top).css('left', rect.left).css('width', rect.width).css('height', rect.height).show();
        self.flush();
        setTimeout(function() {
            frameElement.hide();
            self.flush();
        }, message.duration);
    };
    runtime.on('highlightElement', self.highlightElement);

    _tabs.onShow = function(tabs) {
        var tabs_fg = _tabs.find('div.sk_tabs_fg');
        tabs_fg.html("");
        _tabs.trie = new Trie();
        var hintLabels = Hints.genLabels(tabs.length);
        var tabstr = "<div class=sk_tab style='max-width: {0}px'>".format(window.innerWidth - 50);
        var items = tabs.forEach(function(t, i) {
            var tab = $(tabstr);
            _tabs.trie.add(hintLabels[i].toLowerCase(), t.id);
            tab.html("<div class=sk_tab_hint>{0}</div><div class=sk_tab_wrap><div class=sk_tab_icon><img src='{1}'></div><div class=sk_tab_title>{2}</div></div>".format(hintLabels[i], t.favIconUrl, htmlEncode(t.title)));
            tab.data('url', t.url);
            tabs_fg.append(tab);
        })
        tabs_fg.find('div.sk_tab').each(function() {
            $(this).css('width', $(this).width() + 10);
            $(this).append($("<div class=sk_tab_url>{0}</div>".format($(this).data('url'))));
        });
        _tabs.find('div.sk_tabs_bg').css('width', window.innerWidth).css('height', window.innerHeight);
    }
    self.chooseTab = function() {
        runtime.command({
            action: 'getTabs'
        }, function(response) {
            if (response.tabs.length > runtime.conf.tabsThreshold) {
                showPopup(self.omnibar, {type: 'Tabs'});
            } else {
                showPopup(_tabs, response.tabs);
            }
        });
    };
    runtime.on('chooseTab', self.chooseTab);

    var callbacks = {};
    self.topCommand = function(args, cb) {
        args.id = generateQuickGuid();
        if (cb) {
            callbacks[args.id] = cb;
        }
        self.postMessage('top', args);
    };

    _usage.onShow = function(message) {
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
        [ Normal.mappings, Visual.mappings, Insert.mappings ].map(function(mappings) {
            var words = mappings.getWords();
            for (var i = 0; i < words.length; i++) {
                var w = words[i];
                var meta = mappings.find(w).meta;
                var item = "<div><span class=kbd-span><kbd>{0}</kbd></span><span class=annotation>{1}</span></div>".format(htmlEncode(w), meta.annotation);
                help_groups[meta.feature_group].push(item);
            }
        });
        help_groups = help_groups.map(function(g, i) {
            return "<div><div class=feature_name><span>{0}</span></div>{1}</div>".format(feature_groups[i], g.join(''));
        }).join("");
        $(help_groups).appendTo(holder);
        $("<p style='float:right; width:100%; text-align:right'>").html("<a href='https://github.com/brookhong/surfingkeys' target='_blank' style='color:#0095dd'>More help</a>").appendTo(holder);
        _usage.html(holder.html());
    };

    runtime.on('showUsage', function(message) {
        showPopup(_usage, message);
    });

    self.showUsage = function() {
        // showUsage in frontend.html once more will hide it.
        self.hidePopup();
    };

    self.showPopup = function(message) {
        _popup.html(message);
        showPopup(_popup);
    };
    runtime.on('showPopup', function(message) {
        self.showPopup(message.content);
    });
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
    self.showEditor = function() {
        _popup.html("Not supported.");
        showPopup(_popup);
    };
    runtime.on('showEditor', function(message) {
        showPopup(_editor, message);
    });
    runtime.on('updateOmnibarResult', function(message) {
        Omnibar.listWords(message.words);
    });
    self.openOmnibar = function(message) {
        showPopup(self.omnibar, message);
    };
    runtime.on('openOmnibar', self.openOmnibar);
    self.openFinder = function() {
        Find.open();
    };
    runtime.on('openFinder', self.openFinder);
    self.showBanner = function(message) {
        banner.html(message).show();
        self.flush();
        banner.finish();
        banner.animate({
            "top": "0"
        }, 300);
        banner.delay(message.linger_time || 1000).animate({
            "top": "-3rem"
        }, 300, function() {
            banner.html("").hide();
            self.flush();
        });
    };
    runtime.on('showBanner', function(message) {
        self.showBanner(message.content);
    });
    runtime.on('showBubble', function(message) {
        var pos = message.position;
        _bubble.find('div.sk_bubble_content').html(message.content);
        _bubble.show();
        self.flush("none", true);
        var w = _bubble.width(),
            h = _bubble.height();
        var left = [pos.left - w / 2, w / 2];
        if (left[0] < 0) {
            left[1] += left[0];
            left[0] = 0;
        } else if ((left[0] + w) > window.innerWidth) {
            left[1] += left[0] - window.innerWidth + w;
            left[0] = window.innerWidth - w;
        }
        _bubble.find('div.sk_arrow').css('left', left[1]);
        _bubble.css('top', pos.top - h - 12).css('left', left[0]);
    });
    self.hideBubble = function() {
        _bubble.hide();
    };
    runtime.on('hideBubble', function(message) {
        self.hideBubble();
        self.flush();
    });

    self.showStatus = function(pos, content, duration) {
        StatusBar.show(pos, content, duration);
    };

    runtime.on('showStatus', function(message) {
        self.showStatus(message.position, message.content, message.duration);
    });

    var clipboard_holder = $('<textarea id=sk_clipboard/>');
    clipboard_holder = clipboard_holder[0];
    self.getContentFromClipboard = function(cb) {
        var result = '';
        document.body.appendChild(clipboard_holder);
        clipboard_holder.value = '';
        clipboard_holder.select();
        if (document.execCommand('paste')) {
            result = clipboard_holder.value;
        }
        clipboard_holder.value = '';
        clipboard_holder.remove();
        if (cb) {
            // to make getContentFromClipboard have a same syntax with Front in content window
            // pass result as data attribute of an object.
            cb({data: result});
        }
        return result;
    };
    runtime.on('getContentFromClipboard', function(message) {
        return self.getContentFromClipboard();
    });
    self.writeClipboard = function(message) {
        document.body.appendChild(clipboard_holder);
        clipboard_holder.value = message;
        clipboard_holder.select();
        document.execCommand('copy');
        clipboard_holder.value = '';
        clipboard_holder.remove();
    };
    runtime.on('writeClipboard', function(message) {
        self.writeClipboard(message.content);
    });
    self.hideKeystroke = function() {
        keystroke.animate({
            right: "-2rem"
        }, 300, function() {
            keystroke.html("");
            keystroke.hide();
            self.flush();
        });
    };
    runtime.on('hideKeystroke', self.hideKeystroke);
    self.showKeystroke = function(key) {
        if (keystroke.is(':animated')) {
            keystroke.finish()
        }
        keystroke.show();
        self.flush();
        var keys = keystroke.html() + key;
        keystroke.html(keys);
        if (keystroke.css('right') !== '0px') {
            keystroke.animate({
                right: 0
            }, 300);
        }
    };
    runtime.on('showKeystroke', function(message) {
        self.showKeystroke(message.key);
    });

    self.initPort = function(message) {
        self.ports[message.from] = event.ports[0];
    };

    self.handleMessage = function(event) {
        var _message = event.data;
        if (callbacks[_message.id]) {
            var f = callbacks[_message.id];
            delete callbacks[_message.id];
            f(_message);
        } else if (_message.action && self.hasOwnProperty(_message.action)) {
            var ret = self[_message.action](_message) || {};
            ret.id = _message.id;
            if (_message.from && self.ports[_message.from]) {
                self.ports[_message.from].postMessage(ret);
            }
        }
    };

    return self;
})(Mode);

var addSearchAlias = function(alias, prompt, url, suggestionURL, listSuggestion) {
    SearchEngine.aliases[alias] = {
        prompt: prompt + "≫",
        url: url,
        suggestionURL: suggestionURL,
        listSuggestion: listSuggestion
    };
}

window.addEventListener('message', function(event) {
    Front.handleMessage(event);
}, true);

runtime.command({
    action: 'getSettings'
}, function(response) {
    var rs = response.settings;
    runtime.conf.tabsThreshold = rs.tabsThreshold;
    runtime.conf.omnibarMaxResults = rs.omnibarMaxResults;
    applySettings(rs);

    Normal.enter();
});

$(document).on('surfingkeys:themeChanged', function(evt, theme) {
    $('#sk_theme').html(theme);
});
