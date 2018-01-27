var AceEditor = (function(mode, elmId) {
    $('#' + elmId).css('height', '30%');
    var self = ace.edit(elmId);
    self = $.extend(self, mode);
    self = $.extend(self, {
        name: "AceEditor",
        frontendOnly: true,
        eventListeners: {},
        mode: 'normal'
    });

    var originValue;
    function isDirty() {
        return self.getValue() != originValue;
    }

    var dialog = (function() {
        return {
            open: function(template, onEnter, options) {
                PassThrough.enter();
                var _onClose = options.onClose;
                options.onClose = function() {
                    PassThrough.exit();
                    _onClose && _onClose();
                };
                self.state.cm.openDialog(template, function(q) {
                    onEnter(q);
                    options.onClose();
                }, options);
            }
        };
    })();

    self.exit = function(data) {
        document.activeElement.blur();
        mode.exit.call(self);
        Front.hidePopup();
        if (Front.onEditorSaved) {
            Front.onEditorSaved(data);
            Front.onEditorSaved = undefined;
        } else {
            Front.contentCommand({
                action: 'ace_editor_saved',
                data: data
            });
        }
    };

    self.addEventListener('keydown', function(event) {
        event.sk_suppressed = true;
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)
            && self.mode === 'normal' // vim in normal mode
            && (self.state.cm.state.vim.status === null || self.state.cm.state.vim.status === "") // and no pending normal operation
            && (!self.completer || !self.completer.activated) // and completion popup not opened
        ) {
            if (isDirty()) {
                dialog.open('<span style="font-family: monospace">Quit anyway? Y/n </span><input type="text"/>', function(q) {
                    if (q.toLowerCase() === 'y') {
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
                self.exit();
            }
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
            };
        });
    });
    var urlCompleter = {
        identifierRegexps: [/.*/],
        getCompletions: function(editor, session, pos, prefix, callback) {
            callback(null, allVisitedURLs);
        }
    };

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
                Front.contentCommand({
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
    self._getValue = function() {
        var val = self.getValue();
        if (self.type === 'select') {
            // get current line
            val = self.session.getLine(self.selection.lead.row);
            val = val.match(/.*>< ([^<]*)$/);
            val = val ? val[1] : "";
        }
        return val;
    };
    self.setTheme("ace/theme/chrome");
    var vimDeferred = $.Deferred();
    self.setKeyboardHandler('ace/keyboard/vim', function() {
        var cm = self.state.cm;
        cm.on('vim-mode-change', function(data) {
            self.mode = data.mode;
        });
        cm.on('0-register-set', function(data) {
            var lf = document.activeElement;
            Clipboard.write(data.text);
            lf.focus();
        });
        var vim = cm.constructor.Vim;
        vimDeferred.resolve(vim);
        vim.defineEx("write", "w", function(cm, input) {
            Front.contentCommand({
                action: 'ace_editor_saved',
                data: self._getValue()
            });
        });
        vim.defineEx("wq", "wq", function(cm, input) {
            self.exit(self._getValue());
            // tell vim editor that command is done
            self.state.cm.signal('vim-command-done', '');
        });
        vim.map('<CR>', ':wq', 'normal');
        vim.defineEx("bnext", "bn", function(cm, input) {
            Front.contentCommand({
                action: 'nextEdit',
                backward: false
            });
        });
        vim.map('<C-b>', ':bn', 'normal');
        vim.defineEx("bprevious", "bp", function(cm, input) {
            Front.contentCommand({
                action: 'nextEdit',
                backward: true
            });
        });
        vim.defineEx("quit", "q", function(cm, input) {
            self.exit();
            self.state.cm.signal('vim-command-done', '');
        });
        Front.vimMappings.forEach(function(a) {
            vim.map.apply(vim, a);
        });
        var dk = self.getKeyboardHandler().defaultKeymap;
        if (Front.vimKeyMap && Front.vimKeyMap.length) {
            dk.unshift.apply(dk, Front.vimKeyMap);
        }
    });
    self.container.style.background = "#f1f1f1";
    self.$blockScrolling = Infinity;

    self.show = function(message) {
        $.when(vimDeferred).done(function(vim) {
            self.setValue(message.content, -1);
            originValue = message.content;
            $(self.container).find('textarea').focus();
            self.enter();
            vim.map('<CR>', ':wq', 'insert');
            self.type = message.type;
            self.setFontSize(16);
            if (message.type === 'url') {
                self.renderer.setOption('showLineNumbers', false);
                self.language_tools.setCompleters([urlCompleter]);
                self.css('height', '30%');
            } else if (message.type === 'input') {
                self.renderer.setOption('showLineNumbers', false);
                self.language_tools.setCompleters([pageWordCompleter]);
                self.css('height', '');
            } else {
                self.renderer.setOption('showLineNumbers', true);
                self.language_tools.setCompleters([pageWordCompleter]);
                vim.unmap('<CR>', 'insert');
                vim.map('<C-CR>', ':wq', 'insert');
                self.css('height', '30%');
            }
            self.setReadOnly(message.type === 'select');
            vim.map('<C-d>', '<C-w>', 'insert');
            vim.exitInsertMode(self.state.cm);

            // set cursor at initial line
            self.state.cm.setCursor(message.initial_line, 0);
            self.state.cm.ace.renderer.scrollCursorIntoView();
            // reset undo
            setTimeout( function () {
                self.renderer.session.$undoManager.reset();
            }, 1);

            self.state.cm.ace.setOption('indentedSoftWrap', false);
            self.state.cm.ace.setOption('wrap', true);
        });
    };

    self.css = function(name, value) {
        return $(this.container).css(name, value);
    };

    return self;
})(Mode, 'sk_editor');
