function _filterByTitleOrUrl(urls, query) {
    if (query && query.length) {
        var query = query.toUpperCase();
        urls = urls.filter(function(b) {
            return b.title.toUpperCase().indexOf(query) !== -1 || (b.url && b.url.toUpperCase().indexOf(query) !== -1);
        });
    }
    return urls;
}

var Omnibar = (function(ui) {
    var self = {bookmarkFolders: {}};
    var handlers = {};

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
    self.promptSpan = ui.find('#sk_omnibarSearchArea>span');
    self.resultsDiv = ui.find('#sk_omnibarSearchResult');
    self.input.on('input', function() {
        lastInput = self.input.val();
        handler.onInput && handler.onInput.call(this);
    });
    self.input[0].onkeydown = function(event) {
        if (handler && handler.onKeydown) {
            handler.onKeydown.call(event.target, event) && event.preventDefault();
        }
        if (event.keyCode === KeyboardUtils.keyCodes.ESC) {
            frontendUI.hidePopup();
            event.preventDefault();
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
        } else if (event.keyCode === KeyboardUtils.keyCodes.upArrow || event.keyCode === KeyboardUtils.keyCodes.downArrow) {
            rotateResult(event.keyCode === KeyboardUtils.keyCodes.upArrow);
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

    self.highlight = function(str) {
        return str.replace(new RegExp(Omnibar.input.val(), 'gi'), function(m) {
            return "<span class=omnibar_highlight>" + m + "</span>";
        });
    };

    /**
     * List URLs like {url: "https://github.com", title: "github.com"} beneath omnibar
     * @param {Array} items - Array of url items with title.
     * @param {boolean} showFolder - True to show a item as folder if it has no property url.
     *
     */
    self.listURLs = function(items, showFolder) {
        var sliced = items.slice(0, (runtime.settings.omnibarMaxResults || 20));
        self.listResults(sliced, function(b) {
            var li = $('<li/>');
            if (b.hasOwnProperty('url')) {
                b.title = (b.title && b.title !== "") ? b.title : b.url;
                var type = b.type, additional = "";
                if (!type) {
                    if (b.hasOwnProperty('lastVisitTime')) {
                        type = "☼";
                        additional = "<span class=omnibar_timestamp>@ {0}</span>".format(timeStampString(b.lastVisitTime));
                    } else if(b.hasOwnProperty('dateAdded')) {
                        type = "☆";
                        additional = "<span class=omnibar_folder>@ {0}</span>".format(self.bookmarkFolders[b.parentId] || "");
                    } else {
                        type = "▤";
                    }
                }
                li.html('<div class="title">{0} {1} {2}</div>'.format(type, self.highlight(htmlEncode(b.title)), additional));
                $('<div class="url">').data('url', b.url).html(self.highlight(b.url)).appendTo(li);
            } else if (showFolder) {
                li.html('<div class="title">▷ {0}</div>'.format(self.highlight(b.title))).data('folder_name', b.title).data('folderId', b.id);
            }
            return li;
        });
    };

    ui.onShow = function(args) {
        handler = handlers[args.type];
        self.input[0].focus();
        Insert.suppressKeyEsc = false;
        Insert.enter();
        if (args.pref) {
            self.input.val(args.pref);
        }
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
        Insert.exit();
        Insert.suppressKeyEsc = true;
        handler = null;
    };

    self.openFocused = function() {
        var ret = false, fi = self.resultsDiv.find('li.focused');
        var url = fi.find('div.url').data('url');
        if (url === undefined) {
            url = self.input.val();
            if (url.indexOf(':') === -1) {
                url = "http://" + url;
            }
        }
        if (/^javascript:/.test(url)) {
            var code = url.replace(/^javascript:/,'');
            runtime.command({
                action: "executeScript",
                code: code
            }, function(ret) {
            });
        } else {
            if (url && url.length) {
                runtime.command({
                    action: "openLink",
                    tab: {
                        tabbed: true,
                        active: this.activeTab
                    },
                    url: url
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

    self.listBookmarkFolders = function(cb) {
        runtime.command({
            action: 'getBookmarkFolders'
        }, function(response) {
            self.bookmarkFolders = {};
            response.folders.forEach(function(f) {
                self.bookmarkFolders[f.id] = f.title;
            });
            cb && cb(response);
        });
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
            ret = Omnibar.openFocused.call(self);
        }
        return ret;
    };

    self.onOpen = function() {
        Omnibar.listBookmarkFolders(function() {
            runtime.command({
                action: 'getBookmarks',
            }, self.onResponse);
        });
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
        Omnibar.listURLs(items, true);
        Omnibar.scrollIntoView();
    };

    return self;
})();
Omnibar.addHandler('Bookmarks', OpenBookmarks);

var AddBookmark = (function() {
    var self = {
        prompt: 'add bookmark≫'
    }, folders;

    self.onOpen = function(arg) {
        self.page = arg;
        Omnibar.listBookmarkFolders(function(response) {
            folders = response.folders;
            selectedFolder = folders[0];
            Omnibar.listResults(folders, function(f) {
                return $('<li/>').data('folder', f).html("▷ {0}".format(f.title));
            });
            Omnibar.scrollIntoView();
        });
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
        var focusedItem = Omnibar.resultsDiv.find('li.focused');
        if (focusedItem.length) {
            selectedFolder = focusedItem.data('folder');
        }
        var path = Omnibar.input.val();
        self.page.path = [];
        if (path.indexOf(selectedFolder.title) === 0) {
            path = path.replace(selectedFolder.title,"").split('/');
            var title = path.pop();
            if (title.length) {
                self.page.title = title;
            }
            if (path.length) {
                self.page.path = path;
            }
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

    self.onInput = function() {
        var query = $(this).val();
        var matches = folders.filter(function(b) {
            return b.title.indexOf(query) !== -1;
        });
        Omnibar.listResults(matches, function(f) {
            return $('<li/>').data('folder', f).html("▷ {0}".format(f.title));
        });
    };

    return self;
})();
Omnibar.addHandler('AddBookmark', AddBookmark);

var OpenHistory = (function() {
    var self = {
        prompt: 'history≫'
    }, all;

    self.onOpen = function(arg) {
        runtime.command({
            action: 'getHistory',
            query: {
                startTime: 0,
                text: ""
            }
        }, function(response) {
            all = response.history;
            Omnibar.listURLs(response.history, false);
        });
    };

    self.onEnter = Omnibar.openFocused.bind(self);
    self.onInput = function() {
        var filtered = _filterByTitleOrUrl(all, $(this).val());
        Omnibar.listURLs(filtered, false);
    };
    return self;
})();
Omnibar.addHandler('History', OpenHistory);

var OpenURLs = (function() {
    var self = {
        prompt: '≫'
    }, all;

    function _queryURLs(word) {
        runtime.command({
            action: self.action,
            query: word
        }, function(response) {
            all = response.urls;
            Omnibar.listURLs(response.urls, false);
        });
        if (self.action === "getTopSites") {
            Omnibar.listBookmarkFolders(function() {
                runtime.command({
                    action: 'getAllURLs'
                }, function(response) {
                    all = all.concat(response.urls);
                });
            });
        }
    }
    self.onOpen = function(arg) {
        self.action = arg;
        if (self.action === "getRecentlyClosed") {
            self.prompt = 'Recently closed≫';
        } else if (self.action === "getTabURLs") {
            self.prompt = 'Tab History≫';
        } else {
            self.prompt = '≫';
        }
        _queryURLs("");
    };
    self.onEnter = Omnibar.openFocused.bind(self);
    self.onInput = function() {
        var filtered = _filterByTitleOrUrl(all, $(this).val());
        Omnibar.listURLs(filtered, false);
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
            var markInfo = runtime.settings.marks[m];
            if (typeof(markInfo) === "string") {
                markInfo = {
                    url: markInfo,
                    scrollLeft: 0,
                    scrollTop: 0
                }
            }
            if (query === "" || markInfo.url.indexOf(query) !== -1) {
                urls.push({
                    title: m,
                    type: '♡',
                    url: markInfo.url
                });
            }
        }
        Omnibar.listURLs(urls, false);
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
            url: url
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
    self.onEnter = function() {
        var ret = false;
        var cmdline = Omnibar.input.val();
        if (cmdline.length) {
            runtime.updateHistory('cmd', cmdline);
            var args = parseCommand(cmdline);
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

var OmniQuery = (function() {
    var self = {
        prompt: 'ǭ'
    };
    self.onOpen = function(arg) {
        if (arg) {
            Omnibar.input.val(arg);
            frontendUI.postMessage('top', {
                action: 'omnibar_query_entered',
                query: arg
            });
        }
    };
    self.onEnter = function() {
        frontendUI.postMessage('top', {
            action: 'omnibar_query_entered',
            query: Omnibar.input.val()
        });
    };

    return self;
})();
Omnibar.addHandler('OmniQuery', OmniQuery);
