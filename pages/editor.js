var frontendUI = (function(mode) {
    var self = $.extend({name: "frontendUI", eventListeners: {}, ports: {}}, mode);
    self.addEventListener('keydown', function(event) {
        var handled = "";
        switch (event.keyCode) {
            case KeyboardUtils.keyCodes.ESC:
                self.hidePopup();
                handled = "stopEventPropagation";
                break;
            default:
                if (_tabs.trie) {
                    _tabs.trie = _tabs.trie.find(event.sk_keyName);
                    if (!_tabs.trie) {
                        self.hidePopup();
                        _tabs.trie = null;
                    } else if (_tabs.trie.meta.length) {
                        RUNTIME('focusTab', {
                            tab_id: _tabs.trie.meta[0]
                        });
                        self.hidePopup();
                        _tabs.trie = null;
                    }
                    handled = "stopEventPropagation";
                }
                break;
        }
        return handled;
    });

    self.postMessage = function(to, message) {
        message.id = generateQuickGuid();
        self.ports[to].postMessage(message);
    };
    self.pointerEvents = "none";
    self.flush = function() {
        self.postMessage('top', {
            pointerEvents: self.pointerEvents,
            frameHeight: getFrameHeight()
        });
    };

    self.omnibar = $('#sk_omnibar').hide();
    self.statusBar = $('#sk_status').hide();
    var frameElement = $("<div class=sk_frame>").appendTo('body').hide();
    var _usage = $('<div id=sk_usage>').appendTo('body').hide();
    var _popup = $('<div id=sk_popup>').appendTo('body').hide();
    var _editor = $('<div id=sk_editor>').appendTo('body').hide();
    var _tabs = $("<div class=sk_tabs><div class=sk_tabs_fg></div><div class=sk_tabs_bg></div></div>").appendTo('body').hide();
    var banner = $('<div id=sk_banner/>').appendTo('body').hide();
    var _bubble = $("<div class=sk_bubble>").html("<div class=sk_bubble_content></div>").appendTo('body').hide();
    $("<div class=sk_arrow>").html("<div class=sk_arrowdown></div><div class=sk_arrowdown_inner></div>").css('position', 'absolute').css('top', '100%').appendTo(_bubble);
    var keystroke = $('<div id=sk_keystroke/>').appendTo('body').hide();

    var displays = [self.omnibar, frameElement, _usage, _tabs, banner, _bubble, _popup, _editor, self.statusBar, keystroke];
    function getFrameHeight() {
        for (var i = 0; i < displays.length; i++) {
            if (displays[i].is(':visible')) {
                return '100%';
            }
        }
        return '0px';
    }
    var _display;
    self.hidePopup = function() {
        if (_display && _display.is(':visible')) {
            _display.hide();
            self.flush();
            _display.onHide && _display.onHide();
            self.exit();
            self.pointerEvents = "none";
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
        self.flush();
        self.pointerEvents = "all";
        _display.onShow && _display.onShow(args);
        window.focus();
    }

    runtime.actions['highlightElement'] = function(message) {
        var rect = message.rect;
        frameElement.css('top', rect.top).css('left', rect.left).css('width', rect.width).css('height', rect.height).show();
        self.flush();
        setTimeout(function() {
            frameElement.hide();
            self.flush();
        }, message.duration);
    };

    _tabs.onShow = function(tabs) {
        var tabs_fg = _tabs.find('div.sk_tabs_fg');
        tabs_fg.html("");
        _tabs.trie = new Trie('', Trie.SORT_NONE);
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
    runtime.actions['chooseTab'] = function(message) {
        runtime.command({
            action: 'getTabs'
        }, function(response) {
            if (response.tabs.length > runtime.settings.tabsThreshold) {
                showPopup(self.omnibar, {type: 'Tabs'});
            } else {
                showPopup(_tabs, response.tabs);
            }
        });
    };
    _usage.onShow = function(message) {
        _usage.html(message.content);
    };
    runtime.actions['showUsage'] = function(message) {
        showPopup(_usage, message);
    };
    _popup.onShow = function(message) {
        _popup.html(message.content);
    };
    runtime.actions['showPopup'] = function(message) {
        showPopup(_popup, message);
    };
    _editor.onShow = function(message) {
        AceEditor.show(message);
    };
    runtime.actions['showEditor'] = function(message) {
        showPopup(_editor, message);
    };
    runtime.actions['updateOmnibarResult'] = function(message) {
        Omnibar.listWords(message.words);
    };
    runtime.actions['openOmnibar'] = function(message) {
        showPopup(self.omnibar, message);
    };
    runtime.actions['openFinder'] = function(message) {
        Find.open();
    };
    runtime.actions['showBanner'] = function(message) {
        banner.html(message.content).show();
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
    runtime.actions['showBubble'] = function(message) {
        var pos = message.position;
        _bubble.find('div.sk_bubble_content').html(message.content);
        _bubble.show();
        self.flush();
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
    };
    runtime.actions['hideBubble'] = function(message) {
        _bubble.hide();
        self.flush();
    };
    runtime.actions['showStatus'] = function(message) {
        StatusBar.show(message.position, message.content, message.duration);
    };

    var clipboard_holder = $('<textarea id=sk_clipboard/>');
    clipboard_holder = clipboard_holder[0];
    runtime.actions['getContentFromClipboard'] = function(message) {
        var result = '';
        document.body.appendChild(clipboard_holder);
        clipboard_holder.value = '';
        clipboard_holder.select();
        if (document.execCommand('paste')) {
            result = clipboard_holder.value;
        }
        clipboard_holder.value = '';
        clipboard_holder.remove();
        return result;
    };
    runtime.actions['writeClipboard'] = function(message) {
        document.body.appendChild(clipboard_holder);
        clipboard_holder.value = message.content;
        clipboard_holder.select();
        document.execCommand('copy');
        clipboard_holder.value = '';
        clipboard_holder.remove();
    };
    runtime.actions['hideKeystroke'] = function(message) {
        keystroke.animate({
            right: "-2rem"
        }, 300, function() {
            keystroke.html("");
            keystroke.hide();
            self.flush();
        });
    };
    runtime.actions['showKeystroke'] = function(message) {
        keystroke.show();
        self.flush();
        if (keystroke.is(':animated')) {
            keystroke.finish()
        }
        var keys = keystroke.html() + message.key;
        keystroke.html(keys);
        if (keystroke.css('right') !== '0') {
            keystroke.animate({
                right: 0
            }, 300);
        }
    };

    self.initPort = function(message) {
        self.ports[message.from] = event.ports[0];
    };

    self.handleMessage = function(event) {
        var _message = event.data;
        if (_message.action) {
            if (self.hasOwnProperty(_message.action)) {
                var ret = self[_message.action](_message) || {};
                ret.id = _message.id;
                if (_message.from && self.ports[_message.from]) {
                    self.ports[_message.from].postMessage(ret);
                }
            }
        }
    };

    return self;
})(Mode);

var AceEditor = (function(mode, elmId) {
    var self = ace.edit(elmId);
    self = $.extend(self, mode);
    self = $.extend(self, {name: "AceEditor", eventListeners: {}, mode: 'normal'});

    self.addEventListener('keydown', function(event) {
        event.sk_suppressed = true;
        if (event.keyCode === KeyboardUtils.keyCodes.ESC
            && self.mode === 'normal' // vim in normal mode
            && !self.state.cm.state.vim.inputState.operator // and no pending normal operation
        ) {
            document.activeElement.blur();
            self.exit();
            frontendUI.hidePopup();
        }
    });

    var allVisitedURLs;
    runtime.command({
        action: 'getAllURLs'
    }, function(response) {
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
            }
        });
    });
    var urlCompleter = {
        identifierRegexps: [/.*/],
        getCompletions: function(editor, session, pos, prefix, callback) {
            callback(null, allVisitedURLs);
        }
    };

    var wordsOnPage = [];
    runtime.actions['pageContentReady'] = function(message) {
        var splitRegex = /[^a-zA-Z_0-9\$\-\u00C0-\u1FFF\u2C00-\uD7FF\w]+/;
        var words = message.content.split(splitRegex);
        var wordScores = {};
        words.forEach(function(word) {
            if (wordScores.hasOwnProperty(word)) {
                wordScores[word]++;
            } else {
                wordScores[word] = 1;
            }
        });

        wordsOnPage = Object.keys(wordScores).map(function(w) {
            return {
                caption: w,
                value: w,
                score: wordScores[w],
                meta: 'local'
            }
        });
    };
    var pageWordCompleter = {
        getCompletions: function(editor, session, pos, prefix, callback) {
            callback(null, wordsOnPage);
        }
    };

    ace.config.loadModule('ace/ext/language_tools', function (mod) {
        self.language_tools = mod;
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
        self.setOptions({
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: false,
            enableSnippets: false
        });
    });
    self.setTheme("ace/theme/chrome");
    self.setKeyboardHandler('ace/keyboard/vim', function() {
        var cm = self.state.cm;
        cm.on('vim-mode-change', function(data) {
            self.mode = data.mode;
        });
        self.Vim = cm.constructor.Vim;
        self.Vim.defineEx("write", "w", function(cm, input) {
            frontendUI.postMessage('top', {
                action: 'ace_editor_saved',
                data: self.getValue()
            });
        });
        self.Vim.defineEx("wq", "wq", function(cm, input) {
            frontendUI.postMessage('top', {
                action: 'ace_editor_saved',
                data: self.getValue()
            });
            frontendUI.hidePopup();
        });
        self.Vim.map('<CR>', ':wq', 'normal')
        self.Vim.defineEx("quit", "q", function(cm, input) {
            frontendUI.hidePopup();
        });
    });
    self.container.style.background="#f1f1f1";
    self.$blockScrolling = Infinity;

    self.show = function(message) {
        self.setValue(message.content, -1);
        $(self.container).find('textarea').focus();
        self.enter();
        self.Vim.map('<CR>', ':wq', 'insert')
        if (message.type === 'url') {
            self.renderer.setOption('showLineNumbers', false);
            self.language_tools.setCompleters([urlCompleter]);
            self.css('height', '');
            self.setFontSize(24);
        } else if (message.type === 'input') {
            self.renderer.setOption('showLineNumbers', false);
            self.language_tools.setCompleters([pageWordCompleter]);
            self.css('height', '');
            self.setFontSize('24pt');
        } else {
            self.renderer.setOption('showLineNumbers', true);
            self.language_tools.setCompleters([pageWordCompleter]);
            self.Vim.unmap('<CR>', 'insert')
            self.Vim.map('<C-CR>', ':wq', 'insert')
            self.css('height', '30%');
            self.setFontSize('14pt');
        }
        self.Vim.exitInsertMode(self.state.cm);
    };

    self.css = function(name, value) {
        return $(this.container).css(name, value);
    };

    return self;
})(Mode, 'sk_editor');
