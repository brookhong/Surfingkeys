var Omnibar = (function(ui) {
    var self = {};
    var handlers = {};

    self.miniQuery = {};

    var lastInput, handler, lastHandler = null;
    ui.on('click', function(event) {
        self.input[0].focus();
    });

    function expandAlias(alias) {
        var eaten = false;
        if (lastHandler !== SearchEngine && alias.length && SearchEngine.aliases.hasOwnProperty(alias)) {
            lastHandler = handler;
            handler = SearchEngine;
            $.extend(SearchEngine, SearchEngine.aliases[alias]);
            self.resultsDiv.html("");
            self.promptSpan.html(handler.prompt)
            self.input.val('');
            eaten = true;
        }
        return eaten;
    }

    function collapseAlias() {
        var eaten = false;
        if (lastHandler && handler !== lastHandler && self.input.val() === "") {
            handler = lastHandler;
            lastHandler = null;
            self.promptSpan.html(handler.prompt)
            eaten = true;
        }
        return eaten;
    }

    function rotateResult(backward) {
        var total = self.resultsDiv.find('li').length;
        if (total > 0) {
            var lastFocused = self.focusedItem;
            self.focusedItem = (backward ? (lastFocused + total) : (lastFocused + total + 2)) % (total + 1);
            self.resultsDiv.find('li:nth({0})'.format(lastFocused)).removeClass('focused');
            if (self.focusedItem < total) {
                self.resultsDiv.find('li:nth({0})'.format(self.focusedItem)).addClass('focused');
                handler.onTabKey && handler.onTabKey(self.focusedItem);
                self.scrollIntoView();
            } else {
                self.input.val(lastInput);
            }
        }
    }


    self.input = ui.find('input');
    Events.excludeNode(self.input[0]);
    self.promptSpan = ui.find('#sk_omnibarSearchArea>span');
    self.resultsDiv = ui.find('#sk_omnibarSearchResult');
    self.input.on('input', function() {
        lastInput = self.input.val();
        handler.onInput.call(this);
    });
    self.input[0].onkeydown = function(event) {
        if (handler && handler.onKeydown) {
            handler.onKeydown.call(event.target, event) && event.preventDefault();
        }
        if (event.keyCode === KeyboardUtils.keyCodes.ESC) {
            frontendUI.hidePopup();
        } else if (event.keyCode === KeyboardUtils.keyCodes.enter) {
            handler.activeTab = !event.ctrlKey;
            handler.onEnter() && frontendUI.hidePopup();
        } else if (event.keyCode === KeyboardUtils.keyCodes.space) {
            expandAlias(self.input.val()) && event.preventDefault();
        } else if (event.keyCode === KeyboardUtils.keyCodes.backspace) {
            collapseAlias() && event.preventDefault();
        } else if (event.keyCode === KeyboardUtils.keyCodes.tab) {
            rotateResult(event.shiftKey);
            event.preventDefault();
        }
    };

    self.scrollIntoView = function() {
        var start = self.resultsDiv.position().top;
        var end = start + self.resultsDiv.outerHeight();
        var fi = self.resultsDiv.find('li.focused');
        var pos = fi.position();
        if (pos && (pos.top < start || (pos.top + fi.outerHeight()) > end)) {
            var pos = fi.offset().top - self.resultsDiv.find('>ul').offset().top;
            self.resultsDiv.animate({
                scrollTop: pos
            }, 100);
        }
    };

    self.listBookmark = function(items, showFolder) {
        self.listResults(items, function(b) {
            var li = $('<li/>');
            if (b.hasOwnProperty('url')) {
                var type = b.type || (b.hasOwnProperty('lastVisitTime') ? "☼" : "☆");
                b.title = (b.title && b.title !== "") ? b.title : b.url;
                li.html('<div class="title">{0} {1}</div>'.format(type, htmlEncode(b.title)));
                $('<div class="url">').data('url', b.url).html(b.url).appendTo(li);
            } else if (showFolder) {
                li.html('<div class="title">▷ {0}</div>'.format(b.title)).data('folder_name', b.title).data('folderId', b.id);
            }
            return li;
        });
    };

    ui.onShow = function(args) {
        handler = handlers[args.type];
        self.input[0].focus();
        self.focusedItem = 0;
        handler.onOpen && handler.onOpen(args.extra);
        lastHandler = handler;
        handler = handler;
        self.promptSpan.html(handler.prompt)
        ui[0].scrollTop = 0;
    };

    ui.onHide = function() {
        lastInput = "";
        self.input.val('');
        self.resultsDiv.html("");
        lastHandler = null;
        handler.onClose && handler.onClose();
        handler = null;
    };

    self.openFocused = function() {
        var ret = false, fi = self.resultsDiv.find('li.focused');
        var url = fi.find('div.url').data('url');
        if (/^javascript:/.test(url)) {
            window.location.href = url;
        } else {
            if (url && url.length) {
                runtime.command({
                    action: "openLink",
                    tab: {
                        tabbed: true,
                        active: this.activeTab
                    },
                    url: url,
                    repeats: 1
                });
            }
        }
        ret = this.activeTab;
        return ret;
    };

    self.listResults = function(items, renderItem) {
        var results = $("<ul/>");
        items.forEach(function(b) {
            renderItem(b).appendTo(results);
        });
        var fi = self.focusedItem || 0;
        results.find('li:nth({0})'.format(fi)).addClass('focused');
        self.focusedItem = fi;
        self.resultsDiv.html("");
        results.appendTo(self.resultsDiv);
    };

    self.listWords = function(words) {
        var results = $("<ul/>");
        words.forEach(function(w) {
            var li = $('<li/>').html("⌕ " + w).data('query', w);
            li.appendTo(results);
        });
        self.resultsDiv.html("");
        results.appendTo(self.resultsDiv);
        self.focusedItem = words.length;
    };

    self.html = function(content) {
        self.resultsDiv.html(content);
    };

    self.addHandler = function(name, hdl) {
        handlers[name] = hdl;
    };

    return self;
})(frontendUI.omnibar);

var OpenBookmarks = (function() {
    var self = {
        prompt: 'bookmark≫',
        inFolder: []
    };

    var folderOnly = false,
        currentFolderId;

    function onFolderUp() {
        var fl = self.inFolder.pop();
        if (fl.folderId) {
            currentFolderId = fl.folderId;
            runtime.command({
                action: 'getBookmarks',
                parentId: currentFolderId
            }, self.onResponse);
        } else {
            currentFolderId = undefined;
            runtime.command({
                action: 'getBookmarks',
            }, self.onResponse);
        }
        self.prompt = fl.prompt;
        Omnibar.promptSpan.html(self.prompt)
        Omnibar.focusedItem = fl.focusedItem;
        eaten = true;
    }

    self.onEnter = function() {
        var ret = false,
            fi = Omnibar.resultsDiv.find('li.focused');
        var folderId = fi.data('folderId');
        if (folderId) {
            self.inFolder.push({
                prompt: self.prompt,
                folderId: currentFolderId,
                focusedItem: Omnibar.focusedItem
            });
            self.prompt = fi.data('folder_name') + "≫";
            Omnibar.promptSpan.html(self.prompt)
            Omnibar.input.val('');
            currentFolderId = folderId;
            Omnibar.focusedItem = 0;
            runtime.command({
                action: 'getBookmarks',
                parentId: currentFolderId
            }, OpenBookmarks.onResponse);
        } else {
            Omnibar.openFocused.call(self);
        }
        return ret;
    };

    self.onOpen = function() {
        runtime.command({
            action: 'getBookmarks',
        }, self.onResponse);
    };

    self.onClose = function() {
        self.inFolder = [];
        self.prompt = "bookmark≫";
        currentFolderId = undefined;
        Omnibar.focusedItem = 0;
    };

    self.onKeydown = function(event) {
        var eaten = false;
        if (event.keyCode === KeyboardUtils.keyCodes.comma) {
            folderOnly = !folderOnly;
            self.prompt = folderOnly ? "bookmark folder≫" : "bookmark≫";
            Omnibar.promptSpan.html(self.prompt)
            runtime.command({
                action: 'getBookmarks',
                parentId: currentFolderId,
                query: $(this).val()
            }, self.onResponse);
            eaten = true;
        } else if (event.keyCode === KeyboardUtils.keyCodes.backspace && self.inFolder.length && !$(this).val().length) {
            onFolderUp();
            eaten = true;
        } else if (event.ctrlKey && KeyboardUtils.isWordChar(event)) {
            var focusedURL = Omnibar.resultsDiv.find('li.focused>div.url');
            if (focusedURL.length) {
                var mark_char = String.fromCharCode(event.keyCode);
                mark_char = event.shiftKey ? mark_char : mark_char.toLowerCase();
                Normal.addVIMark(mark_char, focusedURL.data('url'));
                eaten = true;
            }
        }
        return eaten;
    };
    self.onInput = function() {
        runtime.command({
            action: 'getBookmarks',
            parentId: currentFolderId,
            query: $(this).val()
        }, self.onResponse);
    };
    self.onResponse = function(response) {
        var items = response.bookmarks;
        if (folderOnly) {
            items = items.filter(function(b) {
                return !b.hasOwnProperty('url');
            });
        }
        Omnibar.listBookmark(items, true);
        Omnibar.scrollIntoView();
    };

    return self;
})();
Omnibar.addHandler('Bookmarks', OpenBookmarks);

var AddBookmark = (function() {
    var self = {
        prompt: 'add bookmark≫'
    };

    self.onOpen = function(arg) {
        self.page = arg;
        runtime.command({
            action: 'getBookmarkFolders',
        }, self.onResponse);
    };

    self.onClose = function() {
        Omnibar.focusedItem = 0;
    };

    var selectedFolder;
    self.onTabKey = function() {
        selectedFolder = Omnibar.resultsDiv.find('li.focused').data('folder');
        Omnibar.input.val(selectedFolder.title);
    };

    self.onEnter = function() {
        var path = Omnibar.input.val().replace(selectedFolder.title,"").split('/');
        var title = path.pop();
        if (title.length) {
            self.page.title = title;
        }
        if (path.length) {
            self.page.path = path;
        } else {
            self.page.path = [];
        }
        self.page.folder = selectedFolder.id;
        runtime.command({
            action: 'createBookmark',
            page: self.page
        }, function(response) {
            Normal.showBanner("Bookmark created at {0}.".format(selectedFolder.title + self.page.path.join('/')));
        });
        return true;
    };

    var folders;
    self.onInput = function() {
        var query = $(this).val();
        var matches = folders.filter(function(b) {
            return b.title.indexOf(query) !== -1;
        });
        Omnibar.listResults(matches, function(f) {
            return $('<li/>').data('folder', f).html("▷ {0}".format(f.title));
        });
    };
    self.onResponse = function(response) {
        folders = response.folders;
        selectedFolder = folders[0];
        Omnibar.listResults(folders, function(f) {
            return $('<li/>').data('folder', f).html("▷ {0}".format(f.title));
        });
        Omnibar.scrollIntoView();
    };

    return self;
})();
Omnibar.addHandler('AddBookmark', AddBookmark);

var OpenHistory = (function() {
    var self = {
        prompt: 'history≫'
    };

    self.onEnter = Omnibar.openFocused.bind(self);
    self.onInput = function() {
        runtime.command({
            action: 'getHistory',
            query: {
                startTime: 0,
                maxResults: runtime.settings.maxResults,
                text: $(this).val()
            }
        }, function(response) {
            Omnibar.listBookmark(response.history, false);
        });
    };
    return self;
})();
Omnibar.addHandler('History', OpenHistory);

var OpenURLs = (function() {
    var self = {
        prompt: '≫'
    };

    self.onEnter = Omnibar.openFocused.bind(self);
    self.onInput = function() {
        runtime.command({
            action: 'getURLs',
            maxResults: runtime.settings.maxResults,
            query: $(this).val()
        }, function(response) {
            Omnibar.listBookmark(response.urls, false);
        });
    };
    return self;
})();
Omnibar.addHandler('URLs', OpenURLs);

var OpenTabs = (function() {
    var self = {
        prompt: 'tabs≫'
    };

    function listTabs(query) {
        runtime.command({
            action: 'getTabs',
            query: query
        }, function(response) {
            Omnibar.listResults(response.tabs, function(b) {
                var li = $('<li/>').data('tabId', b.id);
                li.html('<div class="title">▤ {0}</div>'.format(b.title));
                $('<div class="url">').html(b.url).appendTo(li);
                return li;
            });
        });
    };
    self.onEnter = function() {
        var fi = Omnibar.resultsDiv.find('li.focused');
        runtime.command({
            action: 'focusTab',
            tab_id: fi.data('tabId')
        });
        return true;
    };
    self.onOpen = function() {
        listTabs('');
    };
    self.onInput = function() {
        listTabs($(this).val());
    };
    return self;
})();
Omnibar.addHandler('Tabs', OpenTabs);

var OpenVIMarks = (function() {
    var self = {
        prompt: 'VIMarks≫'
    };

    self.onOpen = function() {
        var query = Omnibar.input.val();
        var urls = [];
        for (var m in runtime.settings.marks) {
            if (query === "" || runtime.settings.marks[m].indexOf(query) !== -1) {
                urls.push({
                    title: m,
                    type: '♡',
                    url: runtime.settings.marks[m]
                });
            }
        }
        Omnibar.listBookmark(urls, false);
    };
    self.onEnter = Omnibar.openFocused.bind(self);
    self.onInput = self.onOpen;
    return self;
})();
Omnibar.addHandler('VIMarks', OpenVIMarks);

var SearchEngine = (function() {
    var self = {};
    self.aliases = {};

    self.onOpen = function(arg) {
        $.extend(self, self.aliases[arg]);
    };
    self.onClose = function() {
        self.prompt = undefined;
        self.url = undefined;
        self.suggestionURL = undefined;
        self.listSuggestion = undefined;
    };
    self.onTabKey = function() {
        Omnibar.input.val(Omnibar.resultsDiv.find('li:nth({0})'.format(Omnibar.focusedItem)).data('query'));
    };
    self.onEnter = function() {
        var suggestion = Omnibar.resultsDiv.find('li.focused').data('query');
        var url = self.url + (suggestion || Omnibar.input.val());
        runtime.command({
            action: "openLink",
            tab: {
                tabbed: true
            },
            position: runtime.settings.newTabPosition,
            url: url,
            repeats: 1
        });
        return true;
    };
    self.onInput = function() {
        if (self.suggestionURL) {
            runtime.command({
                action: 'request',
                method: 'get',
                url: self.suggestionURL + $(this).val()
            }, self.listSuggestion);
        }
    };
    return self;
})();
Omnibar.addHandler('SearchEngine', SearchEngine);

var Commands = (function() {
    var self = {
        prompt: ':',
        items: {}
    };

    var historyInc = 0;

    function parse(cmdline) {
        var cmdline = cmdline.trim();
        var tokens = [];
        var pendingToken = false;
        var part = '';
        for (var i = 0; i < cmdline.length; i++) {
            if (cmdline.charAt(i) === ' ' && !pendingToken) {
                tokens.push(part);
                part = '';
            } else {
                if (cmdline.charAt(i) === '\"') {
                    pendingToken = !pendingToken;
                } else {
                    part += cmdline.charAt(i);
                }
            }
        }
        tokens.push(part);
        return tokens;
    }


    self.onOpen = function() {
        historyInc = -1;
        var candidates = runtime.settings.cmdHistory;
        if (candidates.length) {
            Omnibar.listResults(candidates, function(c) {
                return $('<li/>').data('cmd', c).html(c);
            });
            Omnibar.focusedItem = 0;
            Omnibar.input.val(candidates[0]);
        }
    };
    self.onInput = function() {
        var cmd = Omnibar.input.val();
        var candidates = Object.keys(self.items).filter(function(c) {
            return cmd === "" || c.indexOf(cmd) !== -1;
        });
        if (candidates.length) {
            Omnibar.focusedItem = candidates.length;
            Omnibar.listResults(candidates, function(c) {
                return $('<li/>').data('cmd', c).html("{0}<span class=annotation>{1}</span>".format(c, htmlEncode(self.items[c].annotation)));
            });
        }
    };
    self.onTabKey = function() {
        Omnibar.input.val(Omnibar.resultsDiv.find('li:nth({0})'.format(Omnibar.focusedItem)).data('cmd'));
    };
    self.onKeydown = function(event) {
        var eaten = false;
        if (event.keyCode === KeyboardUtils.keyCodes.upArrow || event.keyCode === KeyboardUtils.keyCodes.downArrow) {
            if (runtime.settings.cmdHistory.length) {
                historyInc = (event.keyCode === KeyboardUtils.keyCodes.upArrow) ? (historyInc + 1) : (historyInc + runtime.settings.cmdHistory.length - 1);
                historyInc = historyInc % runtime.settings.cmdHistory.length;
                Omnibar.input.val(runtime.settings.cmdHistory[historyInc]);
            }
            eaten = true;
        }
        return eaten;
    };
    self.onEnter = function() {
        var ret = false;
        var cmdline = Omnibar.input.val();
        if (cmdline.length) {
            runtime.updateHistory('cmd', cmdline);
            var args = parse(cmdline);
            var cmd = args.shift();
            if (self.items.hasOwnProperty(cmd)) {
                var code = self.items[cmd].code;
                ret = code.apply(code, args);
            } else {
                var out;
                try {
                    var F = new Function("return " + cmdline);
                    out = F();
                } catch (e) {
                    out = e.toString();
                }
                if (out !== undefined) {
                    out = JSON.stringify(out);
                    out = htmlEncode(out);
                    Omnibar.listResults([out], function(c) {
                        return $('<li/>').html(c);
                    });
                }
            }
            Omnibar.input.val('');
        }
        return ret;
    };
    return self;
})();
Omnibar.addHandler('Commands', Commands);
