import Trie from '../common/trie';
import KeyboardUtils from '../common/keyboardUtils';
import Mode from '../common/mode';
import { debounce } from 'lodash';
import {
    filterByTitleOrUrl,
    regexFromString,
} from '../../common/utils.js';
import {
    attachFaviconToImgSrc,
    createElementWithContent,
    getBrowserName,
    htmlEncode,
    parseAnnotation,
    safeDecodeURI,
    safeDecodeURIComponent,
    scrollIntoViewIfNeeded,
    setSanitizedContent,
    showBanner,
    tabOpenLink,
    timeStampString,
    toggleQuote,
} from '../common/utils.js';
import { RUNTIME, runtime } from '../common/runtime.js';

const separator = '➤';
const separatorHtml = `<span class='separator'>${separator}</span>`;

function createOmnibar(front, clipboard) {
    var self = new Mode("Omnibar");

    self.addEventListener('keydown', function(event) {
        if (event.sk_keyName.length) {
            Mode.handleMapKey.call(self, event);
        }
        event.sk_suppressed = true;
    }).addEventListener('mousedown', function(event) {
        if (!ui.contains(event.target)) {
            front.hidePopup();
        }
        event.sk_suppressed = true;
    });

    self.mappings = new Trie();
    self.map_node = self.mappings;

    function getPosition() {
        let p = runtime.conf.omnibarPosition;
        if (handler && handler.omnibarPosition) {
            p = handler.omnibarPosition;
        }
        return p;
    }

    var savedFocused = -1;

    function reopen(cb) {
        front.hidePopup();
        setTimeout(cb, 100);
    }


    self.mappings.add(KeyboardUtils.encodeKeystroke("<Ctrl-j>"), {
        annotation: "Toggle Omnibar's position",
        feature_group: 8,
        code: function () {
            const savedInput = self.input.value;
            if (runtime.conf.omnibarPosition === "bottom") {
                runtime.conf.omnibarPosition = "middle";
            } else {
                runtime.conf.omnibarPosition = "bottom";
            }
            reopen(function() {
                _savedAargs.pref = savedInput;
                front.openOmnibar(_savedAargs);
            });
        }
    });

    self.mappings.add(KeyboardUtils.encodeKeystroke("<Esc>"), {
        annotation: "Close Omnibar",
        feature_group: 8,
        code: function () {
            front.hidePopup();
        }
    });


    var handlers = {},
        bookmarkFolders;

    var lastInput = "", handler, lastHandler = null;
    var ui = document.getElementById('sk_omnibar');

    self.triggerInput = function() {
        var event = new Event('input', {
            'bubbles': true,
            'cancelable': true
        });
        self.input.dispatchEvent(event);
    };

    self.collapseAlias = function() {
        var eaten = false, val = self.input.value;
        if (lastHandler && handler !== lastHandler && (val === self.collapsingPoint || val === "")) {
            handler = lastHandler;
            lastHandler = null;
            setSanitizedContent(self.promptSpan, handler.prompt);
            if (val.length) {
                self.input.value = val.substr(0, val.length - 1);
            }
            self.triggerInput();
            eaten = true;
        }
        return eaten;
    };

    self.focusItem = function(fi) {
        if (typeof(fi) === 'string') {
            fi = self.resultsDiv.querySelector(fi);
        }
        if (fi) {
            fi.classList.add('focused');
            const fiRect = fi.getBoundingClientRect();
            const resultsRect = self.resultsDiv.getBoundingClientRect();
            if (fiRect.top < resultsRect.top || fiRect.bottom > resultsRect.bottom) {
              const alignToTop = fiRect.top < resultsRect.top;
              fi.scrollIntoView(alignToTop);
            }
        }
    };

    function rotateResult(backward) {
        var items = Array.from(self.resultsDiv.querySelectorAll('#sk_omnibarSearchResult>ul>li'));
        var total = items.length;
        if (total > 0) {
            var fi = self.resultsDiv.querySelector('li.focused');
            if (fi) {
                fi.classList.remove('focused');
            }
            var lastFocused = items.indexOf(fi);
            lastFocused = (lastFocused === -1) ? total : lastFocused;
            var toFocus = (backward ? (lastFocused + total) : (lastFocused + total + 2)) % (total + 1);
            if (toFocus < total) {
                self.focusItem(items[toFocus]);
                handler.onTabKey && handler.onTabKey();
            } else {
                self.input.value = lastInput;
            }
        }
    }

    self.promptSpan = ui.querySelector('#sk_omnibarSearchArea>span.prompt');
    var resultPageSpan = ui.querySelector('#sk_omnibarSearchArea>span.resultPage');
    self.resultsDiv = ui.querySelector('#sk_omnibarSearchResult');

    function _onIput() {
        if (lastInput !== self.input.value) {
            lastInput = self.input.value;
        }
        handler.onInput && handler.onInput.call(this);
    }
    function _onKeyDown(evt) {
        if (handler && handler.onKeydown && handler.onKeydown.call(evt.target, evt)) {
            return;
        }
        if (Mode.isSpecialKeyOf("<Esc>", evt.sk_keyName)) {
            front.hidePopup();
            evt.preventDefault();
        } else if (evt.keyCode === KeyboardUtils.keyCodes.enter) {
            handler.activeTab = !evt.ctrlKey;
            handler.tabbed = self.tabbed ^ evt.shiftKey;
            handler.onEnter() && front.hidePopup();
        } else if (evt.keyCode === KeyboardUtils.keyCodes.space) {
            const cursor = self.input.selectionStart;
            const textBeforeCursor = self.input.value.substring(0, cursor);
            const newQuery = self.input.value.substring(cursor);
            self.expandAlias(textBeforeCursor, newQuery) && evt.preventDefault();
        } else if (evt.keyCode === KeyboardUtils.keyCodes.backspace) {
            self.collapseAlias() && evt.preventDefault();
        }
    }
    function _createInput() {
        var _input = document.createElement("input");
        _input.oninput = _onIput;
        _input.onkeydown = _onKeyDown;
        _input.addEventListener('compositionstart', function(evt) {
            _input.oninput = null;
            _input.onkeydown = null;
        });
        _input.addEventListener('compositionend', function(evt) {
            _input.oninput = _onIput;
            _input.onkeydown = _onKeyDown;
            _onIput();
        });
        return _input;
    }

    self.mappings.add(KeyboardUtils.encodeKeystroke("<Tab>"), {
        annotation: "Forward cycle through the candidates.",
        feature_group: 8,
        code: function () {
            rotateResult(getPosition() === "bottom");
        }
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Shift-Tab>"), {
        annotation: "Backward cycle through the candidates.",
        feature_group: 8,
        code: function () {
            rotateResult(getPosition() !== "bottom");
        }
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Ctrl-n>"), {
        annotation: "Forward cycle through the input history.",
        feature_group: 8,
        code: function () {
            if (handler && handler.rotateInput) {
                handler.rotateInput(getPosition() === "bottom");
            } else {
                rotateResult(getPosition() === "bottom");
            }
        }
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Ctrl-p>"), {
        annotation: "Backward cycle through the input history.",
        feature_group: 8,
        code: function () {
            if (handler && handler.rotateInput) {
                handler.rotateInput(getPosition() !== "bottom");
            } else {
                rotateResult(getPosition() !== "bottom");
            }
        }
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Ctrl-'>"), {
        annotation: "Toggle quotes in an input element",
        feature_group: 8,
        code: toggleQuote
    });

    self.highlight = function(rxp, str) {
        if (str.substr(0, 11) === "data:image/") {
            str = str.substr(0, 1024);
        }
        return (rxp === null) ? str : str.replace(rxp, function(m) {
            return "<span class=omnibar_highlight>" + m + "</span>";
        });
    };

    self.createURLItem = function(b, rxp) {
        b.title = (b.title && b.title !== "") ? b.title : safeDecodeURI(b.url);
        var type = "🔥", additional = "", uid = b.uid;
        if (b.hasOwnProperty('lastVisitTime')) {
            type = "🕜";
            additional = `<span class=omnibar_timestamp># ${timeStampString(b.lastVisitTime)}</span>`;
            additional += `<span class=omnibar_visitcount> (${b.visitCount})</span>`;
            uid = "H" + b.url;
        } else if(b.hasOwnProperty('dateAdded')) {
            type = "⭐";
            additional = `<span class=omnibar_folder>@ ${bookmarkFolders[b.parentId].title || ""}</span> <span class=omnibar_timestamp># ${timeStampString(b.dateAdded)}</span>`;
            uid = "B" + b.id;
        } else if(b.hasOwnProperty('width')) {
            type = "🔖";
            uid = "T" + b.windowId + ":" + b.id;
            // } else if(b.type && /^\p{Emoji}$/u.test(b.type)) {
        } else if(b.type && b.type.length === 2 && b.type.charCodeAt(0) > 255) {
            type = b.type;
        }
        var li = createElementWithContent('li', `<div class="icon">${type}</div>`);
        if (b.hasOwnProperty('favIconUrl')) {
            li = createElementWithContent('li', `<img class="icon"/>`);
            attachFaviconToImgSrc(b, li.querySelector('img'));
        }
        li.appendChild(createElementWithContent('div',
            `<div class="title">${self.highlight(rxp, htmlEncode(b.title))} ${additional}</div><div class="url">${self.highlight(rxp, htmlEncode(safeDecodeURIComponent(b.url)))}</div>`, { "class": "text-container" }));
        li.uid = uid;
        li.url = b.url;
        li._item = b;
        return li;
    };

    self.createItemFromRawHtml = function({ html, props }) {
        const li = createElementWithContent('li', html);
        if (typeof props === "object") {
            Object.assign(li, props);
        }
        return li;
    };

    self.detectAndInsertURLItem = function(str, toList) {
        var urlPat = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/\n\s]+)\.([^:\/\n\s]+)/i,
            urlPat1 = /^https?:\/\/(?:[^@\/\n]+@)?([^:\/\n\s]+)/i;
        if (urlPat.test(str)) {
            var url = str;
            if (! /^https?:\/\//.test(str)) {
                url = "http://" + str;
            }
            toList.unshift({
                title: str,
                url: url
            });
        } else if (urlPat1.test(str)) {
            toList.unshift({
                title: str,
                url: str
            });
        }
    };

    var _start, _items, _showFolder, _page;

    self.getPageSize = () => {
        return runtime.conf.omnibarMaxResults;
    };

    self.listURLs = function(items, showFolder) {
        _start = 1;
        _items = items;
        _showFolder = showFolder;
        _listResultPage();
        if (savedFocused !== -1) {
            const items = self.resultsDiv.querySelectorAll('#sk_omnibarSearchResult>ul>li');
            self.focusItem(items[savedFocused]);
            savedFocused = -1;
        }

    };
    self.getItems = function() {
        return _items;
    };

    function _listResultPage() {
        var si = (_start - 1) * runtime.conf.omnibarMaxResults,
            ei = si + runtime.conf.omnibarMaxResults,
            ei = ei > _items.length ? _items.length : ei,
            total = _items.length;
        if (total === runtime.conf.omnibarHistoryCacheSize) {
            total = total + "+";
        }
        setSanitizedContent(resultPageSpan, `${si + 1} - ${ei} / ${total}`);
        _page = _items.slice(si, ei);
        var query = self.input.value.trim();
        var rxp = null;
        if (query.length) {
            rxp = regexFromString(query, runtime.getCaseSensitive(query), true);
        }
        self.listResults(_page, function(b) {
            var li;
            if (b.hasOwnProperty('html')) {
                li = self.createItemFromRawHtml(b);
            } else if (b.hasOwnProperty('url') && b.url !== undefined) {
                if (getBrowserName() === "Firefox" && /^(place|data):/i.test(b.url)) {
                    return null;
                }
                li = self.createURLItem(b, rxp);
            } else if (_showFolder) {
                li = createElementWithContent('li', `<div class="title">▷ ${self.highlight(rxp, b.title)}</div>`);
                li.folder_name = b.title;
                li.folderId = b.id;
            }
            return li;
        });
    }

    var _savedAargs;
    ui.onShow = function(args) {
        handler = handlers[args.type];
        if (!self.input) {
            self.input = _createInput();
            document.querySelector("#sk_omnibarSearchArea").insertBefore(self.input, resultPageSpan);
        }
        _savedAargs = args;
        ui.classList.remove("sk_omnibar_middle");
        ui.classList.remove("sk_omnibar_bottom");
        if (getBrowserName() === "Safari-iOS") {
            runtime.conf.omnibarPosition = "bottom";
        }
        ui.classList.add("sk_omnibar_" + getPosition());
        if (getPosition() === "bottom") {
            self.resultsDiv.remove();
            ui.insertBefore(self.resultsDiv, document.querySelector("#sk_omnibarSearchArea"));
        } else {
            self.resultsDiv.remove();
            ui.append(self.resultsDiv);
        }

        self.tabbed = (args.tabbed !== undefined) ? args.tabbed : true;
        self.input.focus();
        self.enter();
        if (args.pref) {
            self.input.value = args.pref;
        }
        self.resultsDiv.className = "";
        handler.onOpen && handler.onOpen(args.extra);
        lastHandler = handler;
        handler = handler;
        setSanitizedContent(self.promptSpan, handler.prompt);
        setSanitizedContent(resultPageSpan, "");
        ui.scrollTop = 0;
    };

    ui.onHide = function() {
        // clear cache
        delete self.cachedPromise;
        // delete only deletes properties of an object and
        // cannot normally delete a variable declared using var, whatever the scope.
        _items = null;
        bookmarkFolders = null;

        lastInput = "";
        self.input.value = "";
        self.input.placeholder = "";
        setSanitizedContent(self.resultsDiv, "");
        lastHandler = null;
        handler.onClose && handler.onClose();
        self.exit();
        handler = null;
    };

    self.isUrl = function (input) {
      if (input.match(/\s+/)) {
        return false;
      }

      if (input.match(/^https?:\/\//)) {
        return true;
      }

      var regex = /^(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

      return input.match(regex);
    }

    self.openFocused = function() {
        var ret = false, fi = self.resultsDiv.querySelector('li.focused');
        var url;
        if (fi) {
            url = fi.url;
        }
        var type = "", uid;
        if (fi && fi.uid) {
            uid = fi.uid;
            type = uid[0], uid = uid.substr(1);
        }
        if (type === 'T') {
            uid = uid.split(":");
            RUNTIME('focusTab', {
                windowId: parseInt(uid[0]),
                tabId: parseInt(uid[1])
            });
        } else if (url && url.length) {
            RUNTIME("openLink", {
                tab: {
                    tabbed: this.tabbed,
                    active: this.activeTab
                },
                url: url
            });
        }
        return this.activeTab;
    };

    self.listResults = function (items, renderItem) {
        setSanitizedContent(self.resultsDiv, "");
        if (!items || items.length === 0) {
            return;
        }
        if (getPosition() === "bottom") {
            items.reverse();
        }
        var ul = document.createElement("ul");
        items.forEach(function(b) {
            var li = renderItem(b);
            if (li) {
                ul.append(li);
                li.onclick = () => {
                    if (li.url) {
                        RUNTIME("openLink", {
                            tab: {
                                tabbed: true,
                                active: true,
                            },
                            url: li.url
                        });
                    } else {
                        self.input.value = li.query;
                        self.input.focus();
                    }
                };
            }
        });
        self.resultsDiv.append(ul);
        items = self.resultsDiv.querySelectorAll("#sk_omnibarSearchResult>ul>li");
        if (runtime.conf.focusFirstCandidate || handler.focusFirstCandidate) {
            var fi = (getPosition() === "bottom") ? items.length - 1 : 0;
            items[fi].classList.add('focused');
        }
        if (getPosition() === "bottom" && items.length > 0) {
            scrollIntoViewIfNeeded(items[items.length-1]);
        }
    };

    self.listWords = function(words) {
        self.listResults(words, function(w) {
            var li = createElementWithContent('li', `⌕ ${w}`);
            li.query = w;
            return li;
        });
    };

    self.html = function(content) {
        setSanitizedContent(self.resultsDiv, content);
    };

    self.addHandler = function(name, hdl) {
        if (!hdl.onEnter) {
            hdl.onEnter = self.openFocused.bind(hdl);
        }
        handlers[name] = hdl;
    };

    self.addHandler('Tabs', OpenTabs(self));
    self.addHandler('CloseTabs', CloseTabs(self));
    self.addHandler('Windows', OpenWindows(self, front));
    self.addHandler('Commands', Commands(self, front));
    self.addHandler('OmniQuery', OmniQuery(self, front));
    self.addHandler('UserURLs', OpenUserURLs(self, front));

    front._actions['updateOmnibarResult'] = function(message) {
        self.listWords(message.words);
    };
    return self;
}



function OpenURLs(prompt, omnibar, queryFn) {
    var self = { prompt }, sequenceNumber;

    const queryAndList = () => {
        let myseq = ++sequenceNumber;
        queryFn().then((urls) => {
            if (myseq === sequenceNumber) {
                var val = omnibar.input.value;
                omnibar.detectAndInsertURLItem(val, urls);
                omnibar.listURLs(urls, false);
            }
        });
    };
    self.onOpen = function(arg) {
        if (arg) {
            omnibar.input.value = arg;
        }
        sequenceNumber = 0;
        queryAndList();
    };
    self.onInput = debounce(queryAndList, 200);
    self.onClose = function() {
        self.onInput.cancel();
    };

    self.onReset = function() {
        runtime.conf.historyMUOrder = !runtime.conf.historyMUOrder;
        queryFn().then((historyItems) => {
            if (runtime.conf.historyMUOrder) {
                historyItems = historyItems.sort(function(a, b) {
                    return b.visitCount - a.visitCount;
                });
            } else {
                historyItems = historyItems.sort(function(a, b) {
                    return b.lastVisitTime - a.lastVisitTime;
                });
            }
            omnibar.listURLs(historyItems, false);
        });
    };
    return self;
}

function OpenTabs(omnibar) {
    var self = {
        focusFirstCandidate: true,
    };

    var getTabsArgs = {};
    self.getResults = function () {
        omnibar.cachedPromise = new Promise(function(resolve, reject) {
            getTabsArgs.tabsThreshold = Math.min(runtime.conf.tabsThreshold, Math.ceil(window.innerWidth / 26));
            RUNTIME('getTabs', getTabsArgs, function(response) {
                resolve(response.tabs);
            });
        });
    };
    self.onOpen = function(args) {
        if (args && args.action === "gather") {
            self.prompt = `Gather filtered tabs into current window${separatorHtml}`;
            self.onEnter = function() {
                RUNTIME('gatherTabs', {
                    tabs: omnibar.getItems()
                });
                return true;
            };
            getTabsArgs = {queryInfo: {currentWindow: false}};
        } else {
            self.prompt = `tabs${separatorHtml}`;
            self.onEnter = omnibar.openFocused.bind(self);
            getTabsArgs = {};
            if (args && typeof(args.filter) === 'string') {
                getTabsArgs.filter = args.filter;
            }
        }
        self.getResults();
        self.onInput();
    };
    self.onInput = function() {
        omnibar.cachedPromise.then(function(cached) {
            var filtered = filterByTitleOrUrl(cached, omnibar.input.value, runtime.getCaseSensitive(omnibar.input.value));
            omnibar.listURLs(filtered, false);
        });
    };
    return self;
}

function CloseTabs(omnibar) {
    var self = {
        focusFirstCandidate: true,
    };

    self.onOpen = function() {
        self.prompt = `close tabs${separatorHtml}`;
        omnibar.cachedPromise = new Promise(function(resolve) {
            RUNTIME('getTabs', {queryInfo: {currentWindow: true}}, function(response) {
                resolve(response.tabs);
            });
        });
        self.onInput();
    };
    self.onInput = function() {
        omnibar.cachedPromise.then(function(cached) {
            var filtered = filterByTitleOrUrl(cached, omnibar.input.value, runtime.getCaseSensitive(omnibar.input.value));
            filtered.forEach(function(tab) {
                try {
                    var u = new URL(tab.url);
                    tab.url = u.origin + u.pathname;
                } catch (e) {}
            });
            omnibar.listURLs(filtered, false);
        });
    };
    self.onEnter = function() {
        var items = omnibar.resultsDiv.querySelectorAll('#sk_omnibarSearchResult>ul>li');
        var tabIds = [];
        items.forEach(function(li) {
            if (li.uid && li.uid[0] === 'T') {
                var parts = li.uid.substr(1).split(":");
                tabIds.push(parseInt(parts[1]));
            }
        });
        if (tabIds.length > 0) {
            RUNTIME('closeTabByIds', {tabIds: tabIds});
        }
        return true;
    };
    return self;
}

function OpenWindows(omnibar, front) {
    const self = {
        prompt: `Move current tab to window${separatorHtml}`
    };

    self.getResults = function () {
        omnibar.cachedPromise = new Promise(function(resolve, reject) {
            RUNTIME('getWindows', {
                query: ''
            }, function(response) {
                resolve(response.windows);
            });
        });
    };
    self.onEnter = function() {
        const fi = omnibar.resultsDiv.querySelector('li.focused');
        let windowId = -1;
        if (fi && fi.windowId !== undefined) {
            windowId = fi.windowId;
        }
        RUNTIME('moveToWindow', { windowId });
        return true;
    };
    self.onOpen = function() {
        omnibar.input.placeholder = "Press enter without focusing an item to move to a new window.";
        self.getResults();
        self.onInput();
    };
    self.onInput = function() {
        omnibar.cachedPromise.then(function(cached) {
            if (cached.length === 0) {
                RUNTIME('moveToWindow', { windowId: -1 });
                front.hidePopup();
            }
            let filtered = cached;
            const query = omnibar.input.value;
            let rxp = null;
            if (query && query.length) {
                rxp = regexFromString(query, runtime.getCaseSensitive(query), false);
                filtered = cached.filter(function(w) {
                    for (const t of w.tabs) {
                        if (rxp.test(t.title) || rxp.test(t.url)) {
                            return true;
                        }
                    }
                    return false;
                });
            }
            rxp = regexFromString(query, runtime.getCaseSensitive(query), true);
            omnibar.listResults(filtered, function(w) {
                const li = createElementWithContent('li');
                li.windowId = parseInt(w.id);
                li.classList.add('window');
                if (w.isPreviousChoice) {
                    li.classList.add('focused');
                }
                w.tabs.forEach(t => {
                    const div = createElementWithContent('div', '', {class: "tab_in_window"});
                    div.appendChild(createElementWithContent('div', omnibar.highlight(rxp, t.title), {class: "title"}));
                    div.appendChild(createElementWithContent('div', omnibar.highlight(rxp, new URL(t.url).origin), {class: "url"}));
                    li.appendChild(div);
                });
                // set url so that we can copy all URls of tabs in this window.
                li.url = w.tabs.map(t => {
                    return t.url;
                }).join("\n");
                return li;
            });
        });
    };
    return self;
}


function Commands(omnibar, front) {
    var self = {
        focusFirstCandidate: false,
        prompt: ':',
    }, items = {};

    var historyInc = 0;

    self.onOpen = function() {
        omnibar.resultsDiv.className = "commands";

        if (omnibar.input.value.length) {
            omnibar.triggerInput();
            return;
        }

        historyInc = -1;
        RUNTIME('getSettings', {
            key: 'cmdHistory'
        }, function(response) {
            var candidates = response.settings.cmdHistory;
            if (candidates.length) {
                omnibar.listResults(candidates, function(c) {
                    var li = createElementWithContent('li', c);
                    li.cmd = c;
                    return li;
                });
            }
        });
    };

    self.onReset = self.onOpen;

    self.onInput = function() {
        var cmd = omnibar.input.value;
        var candidates = Object.keys(items).filter(function(c) {
            return cmd === "" || c.indexOf(cmd) !== -1;
        });
        if (candidates.length) {
            omnibar.listResults(candidates, function(c) {
                var li = createElementWithContent('li', `${c}<span class=annotation>${htmlEncode(items[c].annotation)}</span>`);
                li.cmd = c;
                return li;
            });
        }
    };

    self.onTabKey = function() {
        omnibar.input.value = omnibar.resultsDiv.querySelector('li.focused').cmd;
    };

    self.onEnter = function() {
        var ret = false;
        var cmdline = omnibar.input.value;
        if (cmdline.length) {
            RUNTIME('updateInputHistory', { cmd: cmdline });
            execute(cmdline);
            omnibar.input.value = "";
        }
        return ret;
    };

    function parseCommand(cmdline) {
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

    function execute(cmdline) {
        var args = parseCommand(cmdline);
        var cmd = args.shift();
        if (items.hasOwnProperty(cmd)) {
            var meta = items[cmd];
            meta.code.call(meta.code, args);
        } else {
            showBanner(`Unsupported command: ${cmdline}.`, 3000);
        }
    }

    front._actions['executeCommand'] = function (message) {
        execute(message.cmdline);
    };

    omnibar.command = function (cmd, annotation, jscode) {
        var cmd_code = {
            code: jscode
        };
        var ag = parseAnnotation({annotation: annotation, feature_group: 14});
        cmd_code.feature_group = ag.feature_group;
        cmd_code.annotation = ag.annotation;
        items[cmd] = cmd_code;
    };

    return self;
}

function OmniQuery(omnibar, front) {
    var self = {
        prompt: 'ǭ'
    };

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }
    var _words;
    self.onOpen = function(arg) {
        if (arg && document.dictEnabled === undefined) {
            omnibar.input.value = arg;
            front.contentCommand({
                action: 'omnibar_query_entered',
                query: arg
            });
        }
        front.contentCommand({
            action: 'getPageText'
        }, function(message) {
            var splitRegex = /[^a-zA-Z]+/;
            _words = message.data.toLowerCase().split(splitRegex).filter(onlyUnique);
        });
    };

    self.onInput = function() {
        var iw = omnibar.input.value;
        var candidates = _words.filter(function(w) {
            return w.indexOf(iw) !== -1;
        });
        if (candidates.length) {
            omnibar.listResults(candidates, function(w) {
                return createElementWithContent('li', w);
            });
        }
    };

    self.onTabKey = function() {
        omnibar.input.value = omnibar.resultsDiv.querySelector('li.focused').innerText;
    };

    self.onEnter = function() {
        front.contentCommand({
            action: 'omnibar_query_entered',
            query: omnibar.input.value
        });
    };

    return self;
}

function OpenUserURLs(omnibar, front) {
    var self = {
        focusFirstCandidate: true,
        prompt: `UserURLs${separatorHtml}`
    };

    var _items;
    self.onOpen = function(args) {
        _items = args;
        self.onInput();
    };

    self.onInput = function() {
        var query = omnibar.input.value;
        var urls = [];

        urls = filterByTitleOrUrl(_items, query, runtime.getCaseSensitive(query));
        omnibar.listURLs(urls, false);
    };
    self.onEnter = function() {
        var fi = omnibar.resultsDiv.querySelector('li.focused');
        front.contentCommand({
            action: 'userURLs_entered',
            item: fi ? fi._item : { url: omnibar.input.value },
            tabbed: this.tabbed,
            ctrlKey: !this.activeTab,
            shiftKey: omnibar.tabbed ^ this.tabbed,
        });
        return this.activeTab;
    };
    return self;
}

export default createOmnibar;
