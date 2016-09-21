function _matchWithList(str, keys) {
    for (var i = 0; i < keys.length; i++) {
        if (str.indexOf(keys[i]) === -1) {
            return false;
        }
    }
    return true;
}

function _filterByTitleOrUrl(urls, query) {
    if (query && query.length) {
        var keys = query.toUpperCase().trim().split(/\s+/);
        urls = urls.filter(function(b) {
            return _matchWithList(b.title.toUpperCase(), keys) || _matchWithList(b.url.toUpperCase(), keys);
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

    function deleteFocused() {
        var focusedItem = Omnibar.resultsDiv.find('li.focused');
        var uid = focusedItem.data('uid');
        if (uid) {
            runtime.command({
                action: "removeURL",
                uid: uid
            }, function(ret) {
                if (ret.response === "Done") {
                    focusedItem.remove();
                }
            });
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
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            Front.hidePopup();
            event.preventDefault();
        } else if (Mode.isSpecialKeyOf("<Ctrl-d>", event.sk_keyName)) {
            deleteFocused();
            event.preventDefault();
        } else if (event.keyCode === KeyboardUtils.keyCodes.enter) {
            handler.activeTab = !event.ctrlKey;
            handler.onEnter() && Front.hidePopup();
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

    self.highlight = function(rxp, str) {
        return rxp === null ? str : str.replace(rxp, function(m) {
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
        var sliced = items.slice(0, (runtime.conf.omnibarMaxResults || 20));
        var query = Omnibar.input.val().trim();
        var rxp = query.length ? (new RegExp(query.replace(/\s+/, "\|"), 'gi')) : null;
        self.listResults(sliced, function(b) {
            var li = $('<li/>');
            if (b.hasOwnProperty('url')) {
                b.title = (b.title && b.title !== "") ? b.title : b.url;
                var type = b.type, additional = "", uid = b.uid;
                if (!type) {
                    if (b.hasOwnProperty('lastVisitTime')) {
                        type = "☼";
                        additional = "<span class=omnibar_timestamp>@ {0}</span>".format(timeStampString(b.lastVisitTime));
                        uid = "H" + b.url;
                    } else if(b.hasOwnProperty('dateAdded')) {
                        type = "☆";
                        additional = "<span class=omnibar_folder>@ {0}</span>".format(self.bookmarkFolders[b.parentId] || "");
                        uid = "B" + b.id;
                    } else if(b.hasOwnProperty('width')) {
                        type = "▓";
                        uid = "T" + b.id;
                    } else {
                        type = "▤";
                    }
                }
                li.html('<div class="title">{0} {1} {2}</div>'.format(
                    type,
                    self.highlight(rxp, htmlEncode(b.title)),
                    additional
                ));
                $('<div class="url">').html(self.highlight(rxp, b.url)).appendTo(li);
                li.data('uid', uid).data('url', b.url);
            } else if (showFolder) {
                li.html('<div class="title">▷ {0}</div>'.format(self.highlight(rxp, b.title))).data('folder_name', b.title).data('folderId', b.id);
            }
            return li;
        });
    };

    ui.onShow = function(args) {
        self.tabbed = (args.tabbed !== undefined) ? args.tabbed : true;
        handler = handlers[args.type];
        self.input[0].focus();
        PassThrough.enter();
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
        PassThrough.exit();
        handler = null;
    };

    self.openFocused = function() {
        var ret = false, fi = self.resultsDiv.find('li.focused');
        var url = fi.data('url');
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
            var type = "", uid = fi.data('uid');
            if (uid) {
                type = uid[0], uid = uid.substr(1);
            }
            if (type === 'T') {
                runtime.command({
                    action: 'focusTab',
                    tab_id: parseInt(uid)
                });
            } else if (url && url.length) {
                runtime.command({
                    action: "openLink",
                    tab: {
                        tabbed: Omnibar.tabbed,
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
})(Front.omnibar);

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
            var fi = Omnibar.resultsDiv.find('li.focused');
            if (fi.length) {
                var mark_char = String.fromCharCode(event.keyCode);
                // global marks always from here
                Normal.addVIMark(mark_char, fi.data('url'));
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
            Front.showBanner("Bookmark created at {0}.".format(selectedFolder.title + self.page.path.join('/')));
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

    function _queryURLs() {
        if (self.action === "getAllSites") {
            runtime.command({
                action: 'getTabs'
            }, function(response) {
                all = response.tabs;
                runtime.command({
                    action: "getTopSites"
                }, function(response) {
                    all = all.concat(response.urls);
                    Omnibar.listURLs(all, false);
                    Omnibar.listBookmarkFolders(function() {
                        runtime.command({
                            action: 'getAllURLs'
                        }, function(response) {
                            all = all.concat(response.urls);
                        });
                    });
                });
            });
        } else {
            runtime.command({
                action: self.action
            }, function(response) {
                all = response.urls;
                Omnibar.listURLs(response.urls, false);
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
        _queryURLs();
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
    }, all;

    function listTabs(query) {
        runtime.command({
            action: 'getTabs',
            query: query
        }, function(response) {
            all = response.tabs;
            Omnibar.listURLs(response.tabs, false);
        });
    };
    self.onEnter = Omnibar.openFocused.bind(self);
    self.onOpen = function() {
        listTabs('');
    };
    self.onInput = function() {
        var filtered = _filterByTitleOrUrl(all, $(this).val());
        Omnibar.listURLs(filtered, false);
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
        runtime.command({
            action: 'getSettings',
            key: 'marks'
        }, function(response) {
            for (var m in response.settings.marks) {
                var markInfo = response.settings.marks[m];
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
                        uid: 'M' + m,
                        url: markInfo.url
                    });
                }
            }
            Omnibar.listURLs(urls, false);
        });
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
                tabbed: Omnibar.tabbed
            },
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
        runtime.command({
            action: 'getSettings',
            key: 'cmdHistory'
        }, function(response) {
            var candidates = response.settings.cmdHistory;
            if (candidates.length) {
                Omnibar.listResults(candidates, function(c) {
                    return $('<li/>').data('cmd', c).html(c);
                });
                Omnibar.focusedItem = 0;
                Omnibar.input.val(candidates[0]);
            }
        });
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
                ret = code.call(code, args);
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
            Front.contentCommand({
                action: 'omnibar_query_entered',
                query: arg
            });
        }
    };
    self.onEnter = function() {
        Front.contentCommand({
            action: 'omnibar_query_entered',
            query: Omnibar.input.val()
        });
    };

    return self;
})();
Omnibar.addHandler('OmniQuery', OmniQuery);
