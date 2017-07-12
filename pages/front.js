var Front = (function(mode) {
    var self = $.extend({
        name: "Front",
        frontendOnly: true,
        eventListeners: {},
        ports: {}
    }, mode);

    // this object is implementation of UI, it's UI provider
    self.isProvider = function() {
        return true;
    };

    self.contentCommand = function(args, cb) {
        args.toContent = true;
        runtime.command(args, cb);
    };

    self.addEventListener('keydown', function(event) {
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            self.hidePopup();
            event.sk_stopPropagation = true;
        } else {
            if (self.showPressed) {
                if (event.sk_keyName.length > 1) {
                    var keyStr = JSON.stringify({
                        metaKey: event.metaKey,
                        altKey: event.altKey,
                        ctrlKey: event.ctrlKey,
                        shiftKey: event.shiftKey,
                        keyCode: event.keyCode,
                        code: event.code,
                        composed: event.composed,
                        key: event.key
                    }, null, 4);
                    reportIssue("Unrecognized key event: {0}".format(event.sk_keyName), keyStr);
                } else {
                    var s = htmlEncode(decodeKeystroke(event.sk_keyName));
                    if (!s) {
                        s = "&nbsp;";
                    }
                    _popup.find("kbd").html(s);
                }
                event.sk_stopPropagation = true;
            } else if (_tabs.trie) {
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

    self.postMessage = function(to, message) {
        if (self.ports[to]) {
            self.ports[to].postMessage(message);
        }
    };
    self.flush = function() {
        var visibleDivs = $('body>div:visible').toArray();
        var pointerEvents = visibleDivs.map(function(d) {
            var id = $(d).attr('id');
            var divNoPointerEvents = ["sk_keystroke", "sk_richKeystroke", "sk_bubble", "sk_banner", "sk_frame"];
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
            var input = $('#sk_status').find('input').length ? $('#sk_status').find('input') : Omnibar.input;
            input.focus();
        }
        self.postMessage('top', {
            action: 'setFrontFrame',
            pointerEvents: pointerEvents ? "all" : "none",
            frameHeight: visibleDivs.length > 0 ? "100%" : "0px"
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
    var _tabs = $("<div id=sk_tabs><div class=sk_tabs_fg></div><div class=sk_tabs_bg></div></div>").appendTo('body').hide();
    var banner = $('<div id=sk_banner class=sk_theme>').appendTo('body').hide();
    var _bubble = $("<div id=sk_bubble>").html("<div class=sk_bubble_content></div>").appendTo('body').hide();
    $("<div class=sk_arrow>").html("<div></div><div></div>").css('position', 'absolute').css('top', '100%').appendTo(_bubble);
    var keystroke = $('<div id=sk_keystroke class=sk_theme>').appendTo('body').hide();
    var _richKeystroke = $('<div id=sk_richKeystroke class=sk_theme>').appendTo('body').hide();

    var _display;
    self.hidePopup = function() {
        if (_display && _display.is(':visible')) {
            _display.hide();
            self.flush();
            _display.onHide && _display.onHide();
            self.showPressed = false;
            self.exit();
        }
    };
    function showPopup(td, args) {
        self.enter(0, true);
        if (_display && _display.is(':visible')) {
            _display.hide();
            _display.onHide && _display.onHide();
        }
        _display = td;
        _display.show();
        self.flush();
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
            _tabs.trie.add(hintLabels[i].toLowerCase(), t);
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

    function _initL10n(cb) {
        var lang = runtime.conf.language || window.navigator.language;
        if (lang === "en-US") {
            cb(function(str) {
                return str;
            });
        } else {
            fetch(chrome.extension.getURL("pages/l10n.json")).then(function(res) {
                return res.json();
            }).then(function(l10n) {
                if (typeof(l10n[lang]) === "object") {
                    l10n = l10n[lang];
                    cb(function(str) {
                        return l10n[str] ? l10n[str] : str;
                    })
                } else {
                    cb(function(str) {
                        return str;
                    });
                }
            });
        }
    }

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

        _initL10n(function(locale) {
            help_groups[0].push("<div><span class=kbd-span><kbd>&lt;Alt-s&gt;</kbd></span><span class=annotation>{0}</span></div>".format(locale("Toggle SurfingKeys on current site")));

            [ Normal.mappings,
                Visual.mappings,
                Insert.mappings,
                Omnibar.mappings
            ].map(function(mappings) {
                var words = mappings.getWords();
                for (var i = 0; i < words.length; i++) {
                    var w = words[i];
                    var meta = mappings.find(w).meta;
                    w = decodeKeystroke(w);
                    if (meta.annotation.length) {
                        var item = "<div><span class=kbd-span><kbd>{0}</kbd></span><span class=annotation>{1}</span></div>".format(htmlEncode(w), locale(meta.annotation));
                        help_groups[meta.feature_group].push(item);
                    }
                }
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
            _usage.html(holder.html());
        });
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
    runtime.on('showPressed', function(message) {
        self.showPressed = true;
        self.showPopup("<h3>Please any key to check how to use it with SurfingKeys, Esc to quit.</h3><div class='pressedKey'><kbd>&nbsp;</kbd></div>");
    });
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
    self.showEditor = function(element, cb) {
        self.hidePopup();
        self.onEditorSaved = cb;
        setTimeout(function() {
            showPopup(_editor, element);
        }, 10);
    };
    runtime.on('showEditor', function(message) {
        showPopup(_editor, message);
    });
    runtime.on('updateOmnibarResult', function(message) {
        Omnibar.listWords(message.words);
    });
    self.openOmnibar = function(message) {
        showPopup(self.omnibar, message);
        var style = message.style || "";
        self.omnibar.find('style').html("#sk_omnibar {" + style + "}");
    };
    runtime.on('openOmnibar', self.openOmnibar);
    self.openFinder = function() {
        Find.open();
    };
    runtime.on('openFinder', self.openFinder);
    self.showBanner = function(message, linger_time) {
        banner.finish();
        banner.html(htmlEncode(message)).show();
        self.flush();
        banner.animate({
            "top": "0"
        }, 300);
        banner.delay(linger_time || 1000).animate({
            "top": "-3rem"
        }, 300, function() {
            banner.html("").hide();
            self.flush();
        });
    };
    runtime.on('showBanner', function(message) {
        self.showBanner(message.content, message.linger_time);
    });
    runtime.on('showBubble', function(message) {
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
    });
    self.hideBubble = function() {
        _bubble.hide();
        self.flush();
    };
    runtime.on('hideBubble', function(message) {
        self.hideBubble();
    });

    self.showStatus = function(pos, content, duration) {
        StatusBar.show(pos, content, duration);
    };

    runtime.on('showStatus', function(message) {
        self.showStatus(message.position, message.content, message.duration);
    });

    self.toggleStatus = function(message) {
        self.statusBar.toggle();
    };
    runtime.on('toggleStatus', self.toggleStatus);

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
    var _key = "";
    self.hideKeystroke = function() {
        if (runtime.conf.richHintsForKeystroke) {
            _richKeystroke.hide();
            _key = "";
            self.flush();
        } else {
            keystroke.animate({
                right: "-2rem"
            }, 300, function() {
                keystroke.html("");
                keystroke.hide();
                self.flush();
            });
        }
    };
    runtime.on('hideKeystroke', self.hideKeystroke);
    Visual.mappings.add("y", {
        annotation: "Yank a word(w) or line(l) or sentence(s) or paragraph(p)",
        feature_group: 9
    });
    self.showKeystroke = function(key, mode) {
        if (runtime.conf.richHintsForKeystroke) {
            _initL10n(function(locale) {
                _key += key;
                var root = window[mode].mappings.find(_key), words = _key;
                if (root) {
                    words = root.getWords("", true).sort().map(function(w) {
                        var meta = root.find(w).meta;
                        if (meta.annotation || mode !== "Normal") {
                            return "<div><span class=kbd-span><kbd>{0}<span class=candidates>{1}</span></kbd></span><span class=annotation>{2}</span></div>".format(htmlEncode(decodeKeystroke(_key)), w, locale(meta.annotation));
                        } else {
                            return "";
                        }
                    }).join("");
                    if (words.length === 0) {
                        words = _key;
                    }
                }
                _richKeystroke.html(words).show();
                self.flush();
            });
        } else {
            if (keystroke.is(':animated')) {
                keystroke.finish()
            }
            keystroke.show();
            self.flush();
            var keys = keystroke.html() + htmlEncode(decodeKeystroke(key));
            keystroke.html(keys);
            if (keystroke.css('right') !== '0px') {
                keystroke.animate({
                    right: 0
                }, 300);
            }
        }
    };
    runtime.on('showKeystroke', function(message) {
        self.showKeystroke(message.key, message.mode);
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

window.addEventListener('message', function(event) {
    Front.handleMessage(event);
}, true);

$(document).on('surfingkeys:themeChanged', function(evt, theme) {
    $('#sk_theme').html(theme);
});
