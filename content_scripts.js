DEBUG = function(verbose) {
    return verbose ? console.log.bind(console) : function(ss) {
        void(ss)
    };
};
LOG = DEBUG(1);

function getNearestWord(text, offset) {
    var ret = text;
    var nonWord = /\W/;
    if (offset < 0) {
        offset = 0;
    } else if (offset >= text.length) {
        offset = text.length - 1;
    }
    var found = true;
    if (nonWord.test(text[offset])) {
        var delta = 0;
        found = false;
        while (!found && (offset > delta || (offset + delta) < text.length)) {
            delta++;
            found = ((offset - delta) >= 0 && !nonWord.test(text[offset - delta])) || ((offset + delta) < text.length && !nonWord.test(text[offset + delta]));
        }
        offset = ((offset + delta) < text.length && !nonWord.test(text[offset + delta])) ? (offset + delta) : (offset - delta);
    }
    if (found) {
        var start = offset,
            end = offset;
        while (start >= 0 && !nonWord.test(text[start])) {
            start--;
        }
        while (end < text.length && !nonWord.test(text[end])) {
            end++;
        }
        ret = text.substr(start + 1, end - start - 1);
    }
    return ret;
}

function getParentURL() {
    var url = location.href;
    if (location.pathname.length > 1) {
        url = url.endsWith('/') ? url.substr(0, url.length - 1) : url;
        url = url.substr(0, url.lastIndexOf('/'));
    }
    return url;
}

function getZIndex(node) {
    var z = 0;
    do {
        var i = parseInt(getComputedStyle(node).getPropertyValue('z-index'));
        z += (isNaN(i) || i < 0) ? 0 : i;
        node = node.parentNode;
    } while (node && node !== document.body && node !== document);
    return z;
}

(function($) {
    $.fn.regex = function(pattern, fn, fn_a) {
        var fn = fn || $.fn.text;
        return this.filter(function() {
            return pattern.test(fn.apply($(this), fn_a));
        });
    };
    $.expr[':'].css = function(elem, pos, match) {
        var sel = match[3].split('=');
        return $(elem).css(sel[0]) == sel[1];
    }
})(jQuery);

String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{' + i + '\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

function initSmoothScroll(elm) {
    elm.smoothScrollBy = function(x, y, d) {
        var x0 = elm.scrollLeft,
            y0 = elm.scrollTop,
            start = window.performance.now();
        var easeFn = function(t, b, c, d) {
            // t: current time, b: begInnIng value, c: change In value, d: duration
            return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
        };

        function step(timestamp) {
            if ((timestamp - start) < d) {
                window.requestAnimationFrame(step);
            }
            elm.scrollLeft = easeFn(timestamp - start, x0, x, d);
            elm.scrollTop = easeFn(timestamp - start, y0, y, d);
        }
        window.requestAnimationFrame(step);
    };
}

function getScrollableElements(minHeight, minRatio) {
    var nodes = [];
    if (window.innerHeight < document.body.scrollHeight) {
        nodes.push(document.body);
    }
    var nodeIterator = document.createNodeIterator(
        document.body,
        NodeFilter.SHOW_ELEMENT, {
            acceptNode: function(node) {
                return (node !== document.body && node.scrollHeight / node.offsetHeight >= minRatio && node.offsetHeight > minHeight) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });
    for (var node; node = nodeIterator.nextNode(); nodes.push(node));
    return nodes;
}

function removeChild(elements) {
    var cleaned = [];
    for (var i = 0; i < elements.length; i++) {
        var elm = elements[i];
        var parents = cleaned.filter(function(e) {
            return e.contains(elm);
        });
        if (parents.length === 0 || parents[0].querySelectorAll('*').length > 100) {
            for (var j = 0; j < cleaned.length; j++) {
                if (!cleaned[j].deleted && elm.contains(cleaned[j])) {
                    cleaned[j].deleted = true;
                }
            }
            cleaned.push(elm);
        }
    }
    return cleaned.filter(function(e) {
        return !e.deleted;
    });
}

(function() {
    var KeyboardUtils, root;

    KeyboardUtils = {
        keyCodes: {
            ESC: 27,
            backspace: 8,
            deleteKey: 46,
            enter: 13,
            ctrlEnter: 10,
            space: 32,
            shiftKey: 16,
            ctrlKey: 17,
            f1: 112,
            f12: 123,
            comma: 188,
            tab: 9,
            downArrow: 40,
            upArrow: 38
        },
        keyNames: {
            37: "left",
            38: "up",
            39: "right",
            40: "down"
        },
        keyIdentifierCorrectionMap: {
            "U+00C0": ["U+0060", "U+007E"],
            "U+0030": ["U+0030", "U+0029"],
            "U+0031": ["U+0031", "U+0021"],
            "U+0032": ["U+0032", "U+0040"],
            "U+0033": ["U+0033", "U+0023"],
            "U+0034": ["U+0034", "U+0024"],
            "U+0035": ["U+0035", "U+0025"],
            "U+0036": ["U+0036", "U+005E"],
            "U+0037": ["U+0037", "U+0026"],
            "U+0038": ["U+0038", "U+002A"],
            "U+0039": ["U+0039", "U+0028"],
            "U+00BD": ["U+002D", "U+005F"],
            "U+00BB": ["U+003D", "U+002B"],
            "U+00DB": ["U+005B", "U+007B"],
            "U+00DD": ["U+005D", "U+007D"],
            "U+00DC": ["U+005C", "U+007C"],
            "U+00BA": ["U+003B", "U+003A"],
            "U+00DE": ["U+0027", "U+0022"],
            "U+00BC": ["U+002C", "U+003C"],
            "U+00BE": ["U+002E", "U+003E"],
            "U+00BF": ["U+002F", "U+003F"]
        },
        init: function() {
            if (navigator.platform.indexOf("Mac") !== -1) {
                return this.platform = "Mac";
            } else if (navigator.userAgent.indexOf("Linux") !== -1) {
                return this.platform = "Linux";
            } else {
                return this.platform = "Windows";
            }
        },
        getKeyChar: function(event) {
            var character, correctedIdentifiers, keyIdentifier, unicodeKeyInHex;
            if (event.keyIdentifier.slice(0, 2) !== "U+") {
                if (this.keyNames[event.keyCode]) {
                    return this.keyNames[event.keyCode];
                }
                if (event.keyCode >= this.keyCodes.f1 && event.keyCode <= this.keyCodes.f12) {
                    return "f" + (1 + event.keyCode - keyCodes.f1);
                }
                return "";
            }
            keyIdentifier = event.keyIdentifier;
            if ((this.platform === "Windows" || this.platform === "Linux") && this.keyIdentifierCorrectionMap[keyIdentifier]) {
                correctedIdentifiers = this.keyIdentifierCorrectionMap[keyIdentifier];
                keyIdentifier = event.shiftKey ? correctedIdentifiers[1] : correctedIdentifiers[0];
            }
            unicodeKeyInHex = "0x" + keyIdentifier.substring(2);
            character = String.fromCharCode(parseInt(unicodeKeyInHex));
            character = event.shiftKey ? character : character.toLowerCase();
            if (event.ctrlKey) {
                character = 'c-' + character;
            }
            if (event.altKey) {
                character = 'a-' + character;
            }
            if (event.metaKey) {
                character = 'm-' + character;
            }
            return character;
        },
        isPrimaryModifierKey: function(event) {
            if (this.platform === "Mac") {
                return event.metaKey;
            } else {
                return event.ctrlKey;
            }
        },
        isEscape: function(event) {
            return (event.keyCode === this.keyCodes.ESC) || (event.ctrlKey && this.getKeyChar(event) === '[');
        },
        isWordChar: function(event) {
            return (event.keyCode < 123 && event.keyCode >= 97 || event.keyCode < 91 && event.keyCode >= 65 || event.keyCode < 58 && event.keyCode >= 48);
        },
        isPrintable: function(event) {
            var keyChar;
            if (event.metaKey || event.ctrlKey || event.altKey) {
                return false;
            }
            keyChar = event.type === "keypress" ? String.fromCharCode(event.charCode) : this.getKeyChar(event);
            return keyChar.length === 1;
        }
    };

    KeyboardUtils.init();

    root = typeof exports !== "undefined" && exports !== null ? exports : window;

    root.KeyboardUtils = KeyboardUtils;

    root.keyCodes = KeyboardUtils.keyCodes;

}).call(this);


var settings;

function applySettings(resp) {
    Normal.mappings = new Trie('', Trie.SORT_NONE);
    Visual.initMappings();
    var theInstructions = resp.snippets;
    var F = new Function(theInstructions);
    F();
    settings = resp;
    if (window === top) {
        RUNTIME('setSurfingkeysIcon', {
            status: Normal.isBlacklisted()
        });
    }
}

var extension_id;
var port_handlers = {
    'connected': function(response) {
        extension_id = response.extension_id;
        applySettings(response.settings);
        Normal.init();
        $(document).trigger("surfingkeys:connected");
    },
    'request': function(response) {
        var f = httpRequest.success[response.id];
        delete httpRequest.success[response.id];
        f(response.text);
    },
    'settingsUpdated': function(response) {
        applySettings(response.settings);
        Normal.renderUsage();
    }
};

function initPort() {
    var _port = chrome.runtime.connect({
        name: 'main'
    });
    _port.onMessage.addListener(function(response) {
        if (port_handlers[response.type]) {
            port_handlers[response.type](response);
        } else {
            console.log("[unexpected port message] " + JSON.stringify(response))
        }
    });
    return _port;
}
var port = initPort();

var runtime_handlers = {
    'getBlacklist': function(msg, sender, response) {
        response({
            "all": settings.blacklist.hasOwnProperty('.*'),
            "this": settings.blacklist.hasOwnProperty(window.location.origin),
            "origin": window.location.origin
        });
    },
    'toggleBlacklist': function(msg, sender, response) {
        if (settings.blacklist.hasOwnProperty(msg.origin)) {
            delete settings.blacklist[msg.origin];
        } else {
            settings.blacklist[msg.origin] = 1;
        }
        RUNTIME('updateSettings', {
            settings: {
                blacklist: settings.blacklist
            }
        });
        response({
            "all": settings.blacklist.hasOwnProperty('.*'),
            "this": settings.blacklist.hasOwnProperty(window.location.origin),
            "origin": window.location.origin
        });
    },
    'focusFrame': function(msg, sender, response) {
        if (msg.frameId === window.frameId) {
            window.focus();
            Normal.highlightDocument();
        }
    },
};
chrome.runtime.onMessage.addListener(function(msg, sender, response) {
    if (runtime_handlers[msg.subject]) {
        runtime_handlers[msg.subject](msg, sender, response);
    } else {
        console.log("[unexpected runtime message] " + JSON.stringify(msg))
    }
});

RUNTIME = function(action, args) {
    (args = args || {}).action = action;
    try {
        chrome.runtime.sendMessage(args);
    } catch (e) {
        console.log('[runtime exception] ' + e);
        window.location.reload();
    }
}

Hints = {
    'prefix': "",
    'characters': 'asdfgqwertzxcvb'
};
Hints.genLabels = function(M) {
    if (M <= Hints.characters.length) {
        return Hints.characters.slice(0, M).toUpperCase().split('');
    }
    var codes = [];
    var genCodeWord = function(N, length) {
        for (var i = 0, word = ''; i < length; i++) {
            word += Hints.characters.charAt(N % Hints.characters.length).toUpperCase();
            N = ~~(N / Hints.characters.length);
        }
        codes.push(word.split('').reverse().join(''));
    };

    var b = Math.ceil(Math.log(M) / Math.log(Hints.characters.length));
    var cutoff = Math.pow(Hints.characters.length, b) - M;
    var cutoffR = ~~(cutoff / (Hints.characters.length - 1));

    for (var i = 0; i < cutoffR; i++) {
        genCodeWord(i, b - 1);
    }
    for (var j = cutoffR; j < M; j++) {
        genCodeWord(j + cutoff, b);
    }
    return codes;
};
Hints.create = function(cssSelector, onHintKey) {
    $('#surfingkeys_Hints').remove();
    var elements = $(document).find(cssSelector).map(function(i) {
        var elm = this;
        var r = elm.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) {
            var children = $(elm).find('*').filter(function(j) {
                var r = this.getBoundingClientRect();
                return (r.width > 0 && r.height > 0);
            });
            if (children.length) {
                elm = children[0];
                r = elm.getBoundingClientRect();
            }
        }
        var size = (r.width > 0 && r.height > 0);
        var ret = null;
        if (!!r && r.bottom >= 0 && r.right >= 0 && r.top <= document.documentElement.clientHeight && r.left <= document.documentElement.clientWidth && size) {
            ret = elm;
        }
        return ret;
    });
    elements = elements.filter(function(i) {
        return this !== null;
    });
    elements = $(removeChild(elements));
    if (elements.length > 0) {
        var hintsHolder = $('<div id=surfingkeys_Hints/>').appendTo(Normal.ui_container);
        var hintLabels = Hints.genLabels(elements.length);
        elements.each(function(i) {
            var pos = $(this).offset(),
                z = getZIndex(this);
            var link = $('<div/>').css('top', pos.top).css('left', pos.left)
                .css('z-index', z + 1)
                .data('label', hintLabels[i])
                .data('link', this)
                .data('onhint', onHintKey)
                .html(hintLabels[i]);
            hintsHolder.append(link);
        });
        var hints = $('#surfingkeys_Hints').find('>div');
        var bcr = hints[0].getBoundingClientRect();
        for (var i = 1; i < hints.length; i++) {
            var h = hints[i];
            var tcr = h.getBoundingClientRect();
            if (tcr.top === bcr.top && Math.abs(tcr.left - bcr.left) < bcr.width) {
                var top = $(h).offset().top + $(h).height();
                $(h).css('top', top);
            }
            bcr = h.getBoundingClientRect();
        }
    }
};
Hints.dispatchMouseClick = function(element, event) {
    if (element.localName === 'textarea' || (element.localName === 'input' && /^(?!button|checkbox|file|hidden|image|radio|reset|submit)/i.test(element.type)) || element.hasAttribute('contenteditable')) {
        element.focus();
    } else {
        if (event && event.shiftKey && element.href) {
            tabOpenLink(element.href);
        } else {
            var realTargets = $(element).find('a:visible');
            realTargets = (realTargets.length) ? realTargets : $(element).find('select:visible, input:visible, textarea:visible');
            element = realTargets.length ? realTargets[0] : element;
            var events = ['mouseover', 'mousedown', 'mouseup', 'click'];
            events.forEach(function(eventName) {
                var event = document.createEvent('MouseEvents');
                event.initMouseEvent(eventName, true, true, window, 1, 0, 0, 0, 0, false,
                    false, false, false, 0, null);
                element.dispatchEvent(event);
            });
        }
    }
};
Hints.update = function(event) {
    var updated = false;
    var hints = $('#surfingkeys_Hints').find('>div');
    if (hints.length > 0) {
        if (event.keyCode === KeyboardUtils.keyCodes.ESC) {
            Hints.hide();
        } else {
            if (event.keyCode === KeyboardUtils.keyCodes.backspace) {
                Hints.prefix = Hints.prefix.substr(0, Hints.prefix.length - 1);
                updated = true;
            } else {
                var key = String.fromCharCode(event.keyCode);
                if (key !== '' && Hints.characters.indexOf(key.toLowerCase()) !== -1) {
                    Hints.prefix = Hints.prefix + key;
                    updated = true;
                }
            }
            if (updated) {
                var matches = [];
                hints.each(function(i) {
                    var label = $(this).data('label');
                    if (label.indexOf(Hints.prefix) === 0) {
                        $(this).html(label.substr(Hints.prefix.length)).css('opacity', 1);
                        $('<span/>').css('opacity', 0.2).html(Hints.prefix).prependTo(this);
                        matches.push(this);
                    } else {
                        $(this).css('opacity', 0);
                    }
                });
                if (matches.length === 1) {
                    var onhint = $(matches[0]).data('onhint') || Hints.dispatchMouseClick;
                    var link = $(matches[0]).data('link');
                    onhint.call(window, link, event);
                    Hints.hide();
                } else if (matches.length === 0) {
                    Hints.hide();
                }
            }
        }
    }
    return updated;
};
Hints.hide = function() {
    $('#surfingkeys_Hints').remove();
    Hints.prefix = "";
};

OmnibarUtils = {};
OmnibarUtils.openFocused = function() {
    var ret = false,
        focusedItem = $('#surfingkeys_omnibarSearchResult li.focused');
    var folderId = focusedItem.data('folderId');
    if (folderId) {
        this.inFolder.push({
            'prompt': this.prompt,
            'folderId': this.folderId,
            'focusedItem': Normal.omnibar.data('focusedItem')
        });
        this.prompt = focusedItem.data('folder_name') + "≫";
        $('#surfingkeys_omnibarSearchArea>span').html(this.prompt)
        $('#surfingkeys_omnibarSearchArea>input').val('');
        this.folderId = folderId;
        port.postMessage({
            'action': 'getBookmarks',
            'parentId': this.folderId
        });
    } else {
        var url = focusedItem.find('div.url').data('url');
        if (url && url.length) {
            RUNTIME("openLink", {
                tab: {
                    tabbed: !/^javascript:/.test(url)
                },
                url: url,
                repeats: 1
            });
        }
        ret = true;
    }
    return ret;
};
OmnibarUtils.listResults = function(items, renderItem) {
    var results = $("<ul/>");
    items.forEach(function(b) {
        renderItem(b).appendTo(results);
    });
    var fi = Normal.omnibar.data('focusedItem') || 0;
    results.find('li:nth({0})'.format(fi)).addClass('focused');
    Normal.omnibar.data('focusedItem', fi);
    $('#surfingkeys_omnibarSearchResult').html("");
    results.appendTo('#surfingkeys_omnibarSearchResult');
};
OmnibarUtils.listBookmark = function(items, showFolder) {
    OmnibarUtils.listResults(items, function(b) {
        var li = $('<li/>');
        if (b.hasOwnProperty('url')) {
            var type = b.type || (b.hasOwnProperty('lastVisitTime') ? "☼" : "☆");
            b.title = (b.title && b.title !== "") ? b.title : b.url;
            li.html('<div class="title">{1} {0}</div>'.format(b.title, type));
            $('<div class="url">').data('url', b.url).html(b.url).appendTo(li);
        } else if (showFolder) {
            li.html('<div class="title">▷ {0}</div>'.format(b.title)).data('folder_name', b.title).data('folderId', b.id);
        }
        return li;
    });
};
OmnibarUtils.listWords = function(words) {
    var results = $("<ul/>");
    words.forEach(function(w) {
        var li = $('<li/>').html("⌕ " + w).data('query', w);
        li.appendTo(results);
    });
    $('#surfingkeys_omnibarSearchResult').html("");
    results.appendTo('#surfingkeys_omnibarSearchResult');
};
OmnibarUtils.html = function(content) {
    $('#surfingkeys_omnibarSearchResult').html(content);
};

OpenBookmarks = {
    'prompt': 'bookmark≫',
    'inFolder': [],
    'folderOnly': false,
    'onOpen': function() {
        port.postMessage({
            'action': 'getBookmarks'
        });
    },
    'onClose': function() {
        OpenBookmarks.inFolder = [];
        OpenBookmarks.prompt = "bookmark≫";
        delete OpenBookmarks.folderId;
        Normal.omnibar.removeData('focusedItem');
    }
};
OmnibarUtils.onFolderUp = function(handler, message) {
    var fl = handler.inFolder.pop();
    if (fl.folderId) {
        handler.folderId = fl.folderId;
        port.postMessage({
            'action': 'getBookmarks',
            'parentId': handler.folderId
        });
    } else {
        delete handler.folderId;
        port.postMessage(message);
    }
    handler.prompt = fl.prompt;
    $('#surfingkeys_omnibarSearchArea>span').html(handler.prompt)
    Normal.omnibar.data('focusedItem', fl.focusedItem);
    eaten = true;
};
OpenBookmarks.onEnter = OmnibarUtils.openFocused.bind(OpenBookmarks);
OpenBookmarks.onKeydown = function(event) {
    var eaten = false;
    if (event.keyCode === KeyboardUtils.keyCodes.comma) {
        OpenBookmarks.folderOnly = !OpenBookmarks.folderOnly;
        OpenBookmarks.prompt = OpenBookmarks.folderOnly ? "bookmark folder≫" : "bookmark≫";
        $('#surfingkeys_omnibarSearchArea>span').html(OpenBookmarks.prompt)
        port.postMessage({
            'action': 'getBookmarks',
            'parentId': OpenBookmarks.folderId,
            'query': $(this).val()
        });
        eaten = true;
    } else if (event.keyCode === KeyboardUtils.keyCodes.backspace && OpenBookmarks.inFolder.length && !$(this).val().length) {
        OmnibarUtils.onFolderUp(OpenBookmarks, {
            'action': 'getBookmarks'
        });
        eaten = true;
    } else if (event.ctrlKey && KeyboardUtils.isWordChar(event)) {
        var focusedURL = $('#surfingkeys_omnibarSearchResult li.focused>div.url');
        if (focusedURL.length) {
            var mark_char = String.fromCharCode(event.keyCode);
            mark_char = event.shiftKey ? mark_char : mark_char.toLowerCase();
            Normal.addVIMark(mark_char, focusedURL.data('url'));
            eaten = true;
        }
    }
    return eaten;
};
OpenBookmarks.onInput = function() {
    port.postMessage({
        'action': 'getBookmarks',
        'parentId': OpenBookmarks.folderId,
        'query': $(this).val()
    });
};
port_handlers['getBookmarks'] = function(response) {
    var items = response.bookmarks;
    if (OpenBookmarks.folderOnly) {
        items = items.filter(function(b) {
            return !b.hasOwnProperty('url');
        });
    }
    OmnibarUtils.listBookmark(items, true);
    Normal.omnibar.scrollIntoView();
};

OpenHistory = {
    'prompt': 'history≫'
};
OpenHistory.onEnter = OmnibarUtils.openFocused.bind(OpenHistory);
OpenHistory.onInput = function() {
    port.postMessage({
        'action': 'getHistory',
        'query': {
            startTime: 0,
            maxResults: settings.maxResults,
            'text': $(this).val()
        }
    });
};
port_handlers['getHistory'] = function(response) {
    OmnibarUtils.listBookmark(response.history, false);
};

OpenURLs = {
    'prompt': '≫'
};
OpenURLs.onEnter = OmnibarUtils.openFocused.bind(OpenURLs);
OpenURLs.onInput = function() {
    port.postMessage({
        'action': 'getURLs',
        'maxResults': settings.maxResults,
        'query': $(this).val()
    });
};
port_handlers['getURLs'] = function(response) {
    OmnibarUtils.listBookmark(response.urls, false);
};

OpenVIMarks = {
    'prompt': 'VIMarks≫',
    'onOpen': function() {
        var query = $('#surfingkeys_omnibarSearchArea>input').val();
        var urls = [];
        for (var m in settings.marks) {
            if (query === "" || settings.marks[m].indexOf(query) !== -1) {
                urls.push({
                    'title': m,
                    'type': '♡',
                    'url': settings.marks[m]
                });
            }
        }
        OmnibarUtils.listBookmark(urls, false);
    }
};
OpenVIMarks.onEnter = OmnibarUtils.openFocused.bind(OpenVIMarks);
OpenVIMarks.onInput = OpenVIMarks.onOpen;

Find = {
    'caseSensitive': false,
    'status': '',
    'matches': [],
    'history': [],
    'mark_template': $('<surfingkeys_mark>')[0],
    'prompt': '/'
};
Find.initFocus = function() {
    if (Find.matches.length) {
        Find.focused = 0;
        for (var i = 0; i < Find.matches.length; i++) {
            var br = Find.matches[i].getBoundingClientRect();
            if (br.top > 0 && br.left > 0) {
                Find.focused = i;
                Find.status = Find.focused + 1 + ' / ' + Find.matches.length;
                Normal.updateStatusBar();
                break;
            }
        }
    }
};
Find.next = function(backward) {
    if (Find.matches.length) {
        Find.focused = (backward ? (Find.matches.length + Find.focused - 1) : (Find.focused + 1)) % Find.matches.length;
        var ff = Find.matches[Find.focused];
        window.scrollTo($(ff).offset().left - window.innerWidth / 2, $(ff).offset().top - window.innerHeight / 2);
        Find.status = Find.focused + 1 + ' / ' + Find.matches.length;
        Normal.updateStatusBar();
        Visual.select(ff);
    } else if (Find.history.length) {
        Visual.state = 1;
        var query = Find.history[0];
        Visual.hideCursor();
        Find.highlight(new RegExp(query, "g" + (Find.caseSensitive ? "" : "i")));
    }
};
Find.open = function() {
    Visual.state = 1;
    Find.historyInc = 0;
    Normal.statusBar.find('span:nth(0)').show();
    Normal.statusBar.show();
    Normal.statusBar.find('input.find')[0].focus();
};
Find.onInput = function() {
    Visual.hideCursor();
    Find.clear();
    var query = $(this).val();
    if (query.length > 2 && query !== '.*') {
        Find.highlight(new RegExp(query, "g" + (Find.caseSensitive ? "" : "i")));
    }
};
Find.onKeydown = function(event) {
    if (event.keyCode === KeyboardUtils.keyCodes.ESC) {
        Normal.statusBar.find('input.find').val("")
        Normal.statusBar.find('span:nth(0)').hide();
    } else if (event.keyCode === KeyboardUtils.keyCodes.enter) {
        if (Find.matches.length) {
            var query = Normal.statusBar.find('input.find').val();
            if (query !== Find.history[0]) {
                Find.history.unshift(query);
            }
            setTimeout(function() {
                Normal.statusBar.find('input.find').val("")
                Normal.statusBar.find('span:nth(0)').hide();
                document.activeElement.blur();
                Visual.select(Find.matches[Find.focused]);
                Visual.state = 1;
                Normal.updateStatusBar();
            }, 0);
        }
    } else if (event.keyCode === KeyboardUtils.keyCodes.upArrow || event.keyCode === KeyboardUtils.keyCodes.downArrow) {
        Find.historyInc = (event.keyCode === KeyboardUtils.keyCodes.upArrow) ? (Find.historyInc + 1) : (Find.historyInc + Find.history.length - 1);
        Find.historyInc = Find.historyInc % Find.history.length;
        Normal.statusBar.find('input.find').val(Find.history[Find.historyInc]);
        Visual.hideCursor();
        Find.clear();
        Find.highlight(new RegExp(query, "g" + (Find.caseSensitive ? "" : "i")));
    }
};
Find.highlight = function(pattern) {
    Visual.getTextNodes(document.body, pattern).forEach(function(node) {
        var matches = node.data.match(pattern);
        matches.forEach(function(match) {
            var mark = Find.mark_template.cloneNode(false);
            var found = node.splitText(node.data.indexOf(match));
            found.splitText(match.length);
            mark.appendChild(found.cloneNode(true));
            found.parentNode.replaceChild(mark, found);
            Find.matches.push(mark);
            node = mark.nextSibling;
        });
    });
    document.body.normalize();
    Find.initFocus();
};
Find.clear = function() {
    var nodes = Find.matches;
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].parentNode) {
            nodes[i].parentNode.innerHTML = nodes[i].parentNode.innerHTML.replace(/<surfingkeys_mark[^>]*>([^<]+)<\/surfingkeys_mark>/gi, '$1');
        }
    }
    Find.matches = [];
    Find.status = "";
};

SearchEngine = {
    'onClose': function() {
        SearchEngine.prompt = undefined;
        SearchEngine.url = undefined;
        SearchEngine.suggestionURL = undefined;
        SearchEngine.listSuggestion = undefined;
    }
};
SearchEngine.onEnter = function() {
    var suggestion = $('#surfingkeys_omnibarSearchResult li.focused').data('query');
    var url = SearchEngine.url + (suggestion || $('#surfingkeys_omnibarSearchArea>input').val());
    tabOpenLink(url);
    return true;
};
SearchEngine.onInput = function() {
    if (SearchEngine.suggestionURL) {
        Normal.omnibar.removeData('focusedItem');
        httpRequest({
            'url': SearchEngine.suggestionURL + $(this).val()
        }, SearchEngine.listSuggestion);
    }
};

MiniQuery = {};
MiniQuery.onInput = function() {};
MiniQuery.onEnter = function() {
    var q = $('#surfingkeys_omnibarSearchArea>input').val();
    if (q.length) {
        httpRequest({
            'url': MiniQuery.url + q
        }, MiniQuery.listResult);
    }
    return false;
};

function mapkey(keys, annotation, jscode, extra_chars) {
    Normal.mappings.add(keys, {
        code: jscode,
        annotation: annotation,
        extra_chars: extra_chars
    });
}

function vmapkey(keys, annotation, jscode) {
    Visual.mappings.add(keys, {
        code: jscode,
        annotation: annotation
    });
}

function addSearchAlias(alias, prompt, url, suggestionURL, listSuggestion) {
    Normal.searchAliases[alias] = {
        'prompt': prompt + "≫",
        'url': url,
        'suggestionURL': suggestionURL,
        'listSuggestion': listSuggestion
    };
}

function addSearchAliasX(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion) {
    addSearchAlias(alias, prompt, search_url, suggestion_url, callback_to_parse_suggestion);
    mapkey((search_leader_key || 's') + alias, 'Search Selected with ' + prompt, 'searchSelectedWith("{0}")'.format(search_url));
    vmapkey((search_leader_key || 's') + alias, 'Search Selected with ' + prompt, 'searchSelectedWith("{0}")'.format(search_url));
}

function addMiniQuery(alias, prompt, url, listResult) {
    Normal.miniQuery[alias] = {
        'prompt': prompt + "≫",
        'url': url,
        'listResult': listResult
    };
}

function tabOpenLink(url) {
    url = /^\w+:\/\/\w+/i.test(url) ? url : 'https://www.google.com/search?q=' + url;
    RUNTIME("openLink", {
        tab: {
            tabbed: true
        },
        url: url,
        repeats: 1
    });
}

function searchSelectedWith(se) {
    var query = window.getSelection().toString() || Normal.getContentFromClipboard();
    tabOpenLink(se + encodeURI(query));
};

function generateQuickGuid() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

httpRequest = (function() {
    var _imp = function(args, success) {
        var request_id = generateQuickGuid();
        port.postMessage({
            'action': 'request',
            'method': args.method || 'get',
            'id': request_id,
            'url': args.url
        });
        _imp.success[request_id] = success;
    }
    _imp.success = {};
    return _imp;
})();

Normal = {
    'mappings': null,
    'stepSize': 70,
    'scrollNode': null,
    'searchAliases': {},
    'scrollIndex': 0,
    'miniQuery': {}
};
Normal.changeScrollTarget = function() {
    Normal.scrollNodes = getScrollableElements(100, 1.2);
    if (Normal.scrollNodes.length > 0) {
        Normal.scrollIndex = (Normal.scrollIndex + 1) % Normal.scrollNodes.length;
        var sn = Normal.scrollNodes[Normal.scrollIndex];
        Normal.highlightElement(sn);
        sn.scrollIntoView();
    }
}
Normal.scroll = function(type, repeats) {
    if (!Normal.scrollNodes) {
        Normal.scrollNodes = getScrollableElements(100, 1.2);
    }
    if (Normal.scrollNodes.length === 0) {
        return;
    }
    var scrollNode = Normal.scrollNodes[Normal.scrollIndex];
    if (!scrollNode.smoothScrollBy) {
        initSmoothScroll(scrollNode);
    }
    var size = (scrollNode === document.body) ? [window.innerWidth, window.innerHeight] : [scrollNode.offsetWidth, scrollNode.offsetHeight];
    repeats = repeats || 1;
    switch (type) {
        case 'down':
            scrollNode.smoothScrollBy(0, repeats * Normal.stepSize, 500);
            break;
        case 'up':
            scrollNode.smoothScrollBy(0, -repeats * Normal.stepSize, 500);
            break;
        case 'pageDown':
            scrollNode.smoothScrollBy(0, repeats * size[1] / 2, 500);
            break;
        case 'fullPageDown':
            scrollNode.smoothScrollBy(0, repeats * size[1], 500);
            break;
        case 'pageUp':
            scrollNode.smoothScrollBy(0, -repeats * size[1] / 2, 500);
            break;
        case 'fullPageUp':
            scrollNode.smoothScrollBy(0, -repeats * size[1], 500);
            break;
        case 'top':
            scrollNode.smoothScrollBy(0, -scrollNode.scrollTop, 500);
            break;
        case 'bottom':
            scrollNode.smoothScrollBy(scrollNode.scrollLeft, scrollNode.scrollHeight - scrollNode.scrollTop, 500);
            break;
        case 'left':
            scrollNode.smoothScrollBy(repeats * -Normal.stepSize / 2, 0, 500);
            break;
        case 'right':
            scrollNode.smoothScrollBy(repeats * Normal.stepSize / 2, 0, 500);
            break;
        case 'leftmost':
            scrollNode.smoothScrollBy(-scrollNode.scrollLeft - 10, 0, 500);
            break;
        case 'rightmost':
            scrollNode.smoothScrollBy(scrollNode.scrollWidth - scrollNode.scrollLeft - size[0] + 20, 0, 500);
            break;
        default:
            break;
    }
};
Normal.rotateFrame = function() {
    RUNTIME('nextFrame');
};
Normal.isBlacklisted = function() {
    return settings.blacklist[window.location.origin] || settings.blacklist['.*'];
};
Normal.init = function() {
    if (!settings) {
        port = initPort();
        port_handlers['getSettings'] = port_handlers['settingsUpdated'];
        port.postMessage({
            'action': 'getSettings'
        });
    }
    var blacklisted = Normal.isBlacklisted();
    if (!blacklisted && !Normal.ui_container) {
        Normal.map_node = Normal.mappings;
        Normal.ui_container = $('<div id={0}_container class=surfingkeys_css_reset/>'.format(extension_id)).css('z-index', 999);
        document.lastElementChild.appendChild(Normal.ui_container[0]);
        Normal.clipboard_holder = $('<textarea/>').attr('surfingkeys', 1).css('position', 'fixed').css('z-index', '-999')
            .css('top', '0').css('left', '0').css('opacity', '0');
        Normal.clipboard_holder.appendTo(Normal.ui_container);
        Normal.keystroke = $('<div id=surfingkeys_keystroke/>');
        Normal.keystroke.appendTo(Normal.ui_container);
        Normal.popover = $('<div id=surfingkeys_popover/>');
        Normal.popover.appendTo(Normal.ui_container);
        Normal.frameElement = $("<div class=surfingkeys_frame>");
        Normal.ttt = $("<div style='position:absolute;z-index:2147483647;padding: 8px 4px; background-color:#000'>").appendTo(Normal.ui_container).hide();
        Normal._bubble = $("<div class=surfingkeys_bubble>").html("<div class=surfingkeys_bubble_content></div>").appendTo(Normal.ui_container).hide();
        $("<div class=surfingkeys_arrow>").html("<div class=surfingkeys_arrowdown></div><div class=surfingkeys_arrowdown_inner></div>").css('position', 'absolute').css('top', '100%').appendTo(Normal._bubble);
        Normal.statusBar = $('<div id=surfingkeys_status/>').html("<span style='display: none'>/<input class='find'/></span><span/>").hide();
        Normal.statusBar.appendTo(Normal.ui_container);
        Normal.statusBar.find('input.find').on('keydown', Find.onKeydown).on('input', Find.onInput);
        Normal.omnibar = $('<div id=surfingkeys_omnibar/>').html('<div id="surfingkeys_omnibarSearchArea"><span></span><input type="text" /></div><div id="surfingkeys_omnibarSearchResult"></div>').hide();
        Normal.omnibar.lastHandler = null;
        Normal.omnibar.appendTo(Normal.ui_container);
        Normal.omnibar.scrollIntoView = function() {
            var start = $('#surfingkeys_omnibarSearchResult').position().top;
            var end = start + $('#surfingkeys_omnibarSearchResult').outerHeight();
            var pos = $('#surfingkeys_omnibarSearchResult li.focused').position();
            if (pos && (pos.top < start || (pos.top + $('#surfingkeys_omnibarSearchResult li.focused').outerHeight()) > end)) {
                var pos = $('#surfingkeys_omnibarSearchResult li.focused').offset().top - $('#surfingkeys_omnibarSearchResult>ul').offset().top;
                $('#surfingkeys_omnibarSearchResult').animate({
                    scrollTop: pos
                }, 100);
            }
        };
        Normal.usage = $('<div id=surfingkeys_Usage/>').hide();
        Normal.usage.appendTo(Normal.ui_container);
        Normal.renderUsage();
        Normal.omnibar.on('click', function(event) {
            Normal.omnibar.find('input')[0].focus();
        });
        Normal.omnibar.find('input').on('keydown', function(event) {
            if (Normal.omnibar.handler.onKeydown) {
                if (Normal.omnibar.handler.onKeydown.call(this, event)) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                }
            }
            if (event.keyCode === KeyboardUtils.keyCodes.ESC) {
                Normal.closeOmnibar();
            } else if (event.keyCode === KeyboardUtils.keyCodes.enter) {
                if (Normal.omnibar.handler.onEnter()) {
                    Normal.closeOmnibar();
                }
            } else if (event.keyCode === KeyboardUtils.keyCodes.space && Normal.expandAlias($(this).val())) {
                event.preventDefault();
            } else if (event.keyCode === KeyboardUtils.keyCodes.backspace && Normal.collapseAlias()) {
                event.preventDefault();
            } else if (event.keyCode === KeyboardUtils.keyCodes.tab) {
                Normal.rotateResult(event.shiftKey);
                event.preventDefault();
            }
        }).on('input', function() {
            Normal.omnibar.handler.onInput.call(this);
        });
        Visual.init();
    }
    if ($(document).find(Normal.ui_container).length === 0 && Normal.ui_container) {
        document.lastElementChild.appendChild(Normal.ui_container[0]);
    }
    return !blacklisted && Normal.ui_container;
};
Normal.updateStatusBar = function() {
    var status = [Visual.status[Visual.state], Find.status].filter(function(e) {
        return e !== ""
    });
    var msg = status.join(' | ');
    Normal.statusBar.find('span:nth(1)').html(msg);
    Normal.statusBar.css('display', (msg.length) ? 'block' : 'none');
};
Normal.popup = function(msg, linger_time) {
    if (Normal.init() && msg) {
        Normal.popover.html(msg);
        Normal.popover.finish();
        Normal.popover.animate({
            "top": "0"
        }, 300);
        Normal.popover.delay(linger_time || 1000).animate({
            "top": "-3rem"
        }, 300);
    }
};
Normal.bubble = function(pos, msg) {
    Normal._bubble.find('div.surfingkeys_bubble_content').html(msg);
    Normal._bubble.show();
    var w = Normal._bubble.width(),
        h = Normal._bubble.height();
    var left = [pos.left - w / 2, w / 2];
    if (left[0] < 0) {
        left[1] += left[0];
        left[0] = 0;
    } else if ((left[0] + w) > window.innerWidth) {
        left[1] += left[0] - window.innerWidth + w;
        left[0] = window.innerWidth - w;
    }
    Normal._bubble.find('div.surfingkeys_arrow').css('left', left[1]);
    Normal._bubble.css('top', pos.top - h - 12).css('left', left[0]);
};
Normal.highlightElement = function(elm) {
    var pos = $(elm).offset();
    Normal.frameElement.css('top', pos.top).css('left', pos.left).css('width', $(elm).width()).css('height', $(elm).height()).appendTo('body');
    setTimeout(function() {
        Normal.frameElement.remove();
    }, 200);
};
Normal.highlightDocument = function() {
    document.body.scrollIntoView();
    Normal.frameElement.css('top', window.scrollY).css('left', window.scrollX).css('width', window.innerWidth).css('height', window.innerHeight).appendTo('body');
    setTimeout(function() {
        Normal.frameElement.remove();
    }, 200);
};
Normal.renderMappings = function(mappings) {
    var tb = $('<table/>'),
        words = mappings.getWords();
    var left = words.length % 2;
    for (var i = 0; i < words.length - left; i += 2) {
        $("<tr><td class=keyboard><kbd>{0}</kbd></td><td class=annotation>{1}</td><td class=keyboard><kbd>{2}</kbd></td><td class=annotation>{3}</td></tr>".format(words[i], mappings.find(words[i]).meta[0].annotation, words[i + 1], mappings.find(words[i + 1]).meta[0].annotation)).appendTo(tb);
    }
    if (left) {
        var w = words[words.length - 1];
        $("<tr><td class=keyboard><kbd>{0}</kbd></td><td class=annotation>{1}</td><td></td><td></td></tr>".format(w, mappings.find(w).meta[0].annotation)).appendTo(tb);
    }
    return tb;
};
Normal.renderUsage = function() {
    $('#surfingkeys_Usage').html("");
    Normal.renderMappings(Normal.mappings).appendTo('#surfingkeys_Usage');
    var moreHelp = $("<p style='float:right; width:100%; text-align:right'>").html("<a href='#' style='color:#0095dd'>Show Mappings in Visual mode</a> | <a href='https://github.com/brookhong/surfingkeys' target='_blank' style='color:#0095dd'>More help</a>").appendTo('#surfingkeys_Usage');
    moreHelp.find('a:nth(0)').on('click', function() {
        $('#surfingkeys_Usage .surfingkeys_VisualUsage').toggle();
    });
    Normal.renderMappings(Visual.mappings).attr('class', 'surfingkeys_VisualUsage').appendTo('#surfingkeys_Usage').hide();
};
Normal.showUsage = function() {
    if (Normal.usage) {
        Normal.closeOmnibar();
        $('#surfingkeys_Usage').show();
    }
};
Normal.hideUsage = function() {
    var updated = false;
    if (Normal.usage.is(':visible')) {
        Normal.usage.hide();
        updated = true;
    }
    return updated;
};
Normal.getContentFromClipboard = function() {
    var result = '';
    var clipboard_holder = Normal.clipboard_holder[0];
    clipboard_holder.value = '';
    clipboard_holder.select();
    if (document.execCommand('paste')) {
        result = clipboard_holder.value;
    }
    clipboard_holder.value = '';
    return result;
};
Normal.writeClipboard = function(text) {
    var clipboard_holder = Normal.clipboard_holder[0];
    clipboard_holder.value = text;
    clipboard_holder.select();
    document.execCommand('copy');
    clipboard_holder.value = '';
    clipboard_holder.blur();
};
Normal.expandAlias = function(alias) {
    var eaten = false;
    if (!Normal.omnibar.lastHandler && alias.length && Normal.searchAliases.hasOwnProperty(alias)) {
        Normal.omnibar.lastHandler = Normal.omnibar.handler;
        Normal.omnibar.handler = SearchEngine;
        $.extend(SearchEngine, Normal.searchAliases[alias]);
        $('#surfingkeys_omnibarSearchResult').html("");
        $('#surfingkeys_omnibarSearchArea>span').html(Normal.omnibar.handler.prompt)
        $('#surfingkeys_omnibarSearchArea>input').val('');
        eaten = true;
    }
    return eaten;
};
Normal.collapseAlias = function() {
    var eaten = false;
    if (Normal.omnibar.lastHandler && Normal.omnibar.handler !== Normal.omnibar.lastHandler && $('#surfingkeys_omnibarSearchArea>input').val() === "") {
        Normal.omnibar.handler = Normal.omnibar.lastHandler;
        Normal.omnibar.lastHandler = null;
        $('#surfingkeys_omnibarSearchArea>span').html(Normal.omnibar.handler.prompt)
        SearchEngine.reset();
        eaten = true;
    }
    return eaten;
};
Normal.rotateResult = function(backward) {
    var eaten = false;
    var total = $('#surfingkeys_omnibarSearchResult li').length;
    if (total > 0) {
        var focused = Normal.omnibar.data('focusedItem');
        var next = (backward ? (focused + total) : (focused + total + 2)) % (total + 1);
        if (focused === undefined) {
            focused = backward ? (total - 1) : 0;
            next = focused;
        }
        $('#surfingkeys_omnibarSearchResult li:nth({0})'.format(focused)).removeClass('focused');
        if (next === total) {
            Normal.omnibar.removeData('focusedItem');
        } else {
            $('#surfingkeys_omnibarSearchResult li:nth({0})'.format(next)).addClass('focused');
            Normal.omnibar.data('focusedItem', next);
            Normal.omnibar.scrollIntoView();
        }
        eaten = true;
    }
    return eaten;
};
Normal.showKeystroke = function(msg) {
    if (Normal.keystroke) {
        if (Normal.keystroke.is(':animated')) {
            Normal.keystroke.finish()
        }
        var keys = Normal.keystroke.html() + msg;
        Normal.keystroke.html(keys);
        if (Normal.keystroke.css('right') !== '0') {
            Normal.keystroke.animate({
                'right': 0
            }, 300, function() {});
        }
    }
};
Normal.hideKeystroke = function() {
    var ret = false;
    if (Normal.keystroke) {
        Normal.keystroke.animate({
            'right': "-2rem"
        }, 300, function() {
            Normal.keystroke.html("");
        });
        ret = true;
    }
    return ret;
};
Normal.finish = function(event) {
    Normal.map_node = Normal.mappings;
    Normal.pendingMap = null;
    return Normal.hideKeystroke();
};
Normal.update = function(event) {
    var updated = false;
    switch (event.keyCode) {
        case 27:
            updated = Normal.hideUsage() || Normal.closeOmnibar() || Normal.finish();
            break;
        case KeyboardUtils.keyCodes.ctrlKey:
        case KeyboardUtils.keyCodes.shiftKey:
            break;
        default:
            var key = KeyboardUtils.getKeyChar(event);
            if (Normal.pendingMap) {
                Normal.pendingMap(key);
                Normal.finish();
                updated = true;
            } else {
                Normal.map_node = Normal.map_node.find(key);
                if (Normal.map_node === null) {
                    Normal.finish();
                } else if (Normal.map_node.meta.length) {
                    if (typeof(Normal.map_node.meta[0].code) === 'function') {
                        if (Normal.map_node.meta[0].extra_chars) {
                            Normal.pendingMap = Normal.map_node.meta[0].code;
                            Normal.showKeystroke(key);
                        } else {
                            Normal.map_node.meta[0].code();
                            Normal.finish();
                        }
                    } else if (typeof(Normal.map_node.meta[0].code) === 'string') {
                        eval(Normal.map_node.meta[0].code);
                        Normal.finish();
                    }
                    updated = true;
                } else {
                    Normal.showKeystroke(key);
                    updated = true;
                }
            }
            break;
    }
    return updated;
};
Normal.openOmnibar = function(handler, type) {
    if (Normal.omnibar) {
        Normal.omnibar.show();
        Normal.hideUsage();
        Normal.omnibar.find('input')[0].focus();
        if (handler === SearchEngine && Normal.searchAliases.hasOwnProperty(type)) {
            $.extend(SearchEngine, Normal.searchAliases[type]);
            Normal.omnibar.lastHandler = SearchEngine;
        } else if (handler === MiniQuery && Normal.miniQuery.hasOwnProperty(type)) {
            $.extend(MiniQuery, Normal.miniQuery[type]);
            Normal.omnibar.lastHandler = MiniQuery;
        }
        Normal.omnibar.handler = handler;
        $('#surfingkeys_omnibarSearchArea>span').html(handler.prompt)
        Normal.omnibar.handler.onOpen && Normal.omnibar.handler.onOpen();
    }
};
Normal.closeOmnibar = function() {
    var updated = false;
    if (Normal.omnibar.is(':visible')) {
        Normal.omnibar.hide();
        Normal.omnibar.find('input').val('');
        $('#surfingkeys_omnibarSearchResult').html("");
        Normal.omnibar.lastHandler = null;
        Normal.omnibar.handler.onClose && Normal.omnibar.handler.onClose();
        Normal.omnibar.handler = null;
        updated = true;
    }
    return updated;
};
Normal.addVIMark = function(mark, url) {
    url = url || window.location.href;
    settings.marks[mark] = url;
    RUNTIME('updateSettings', {
        settings: {
            marks: settings.marks
        }
    });
    Normal.popup("Mark '{0}' added for: {1}.".format(mark, url));
};
Normal.jumpVIMark = function(mark) {
    if (settings.marks.hasOwnProperty(mark)) {
        window.location.href = settings.marks[mark];
    } else {
        Normal.popup("No mark '{0}' defined.".format(mark));
    }
};

Visual = {
    'state': 0,
    'auto': false,
    'status': ['', 'Caret', 'Range'],
    'cursor': $('<surfingkeys_cursor></surfingkeys_cursor')[0],
};
Visual.initMappings = function() {
    Visual.mappings = new Trie('', Trie.SORT_NONE);
    vmapkey("l", "forward character");
    vmapkey("h", "backward character");
    vmapkey("j", "forward line");
    vmapkey("k", "backward line");
    vmapkey("w", "forward word");
    vmapkey("b", "backward word");
    vmapkey(")", "forward sentence");
    vmapkey("(", "backward sentence");
    vmapkey("}", "forward paragraph");
    vmapkey("{", "backward paragraph");
    vmapkey("0", "backward lineboundary");
    vmapkey("$", "forward lineboundary");
    vmapkey("G", "forward documentboundary");
    vmapkey("gg", "backward documentboundary");
    vmapkey("y", "Copy selected text", "Visual.yank()");
    vmapkey("*", "Search word under the cursor", "Visual.star()");
};
Visual.init = function() {
    Visual.map_node = Visual.mappings;
    Visual.selection = document.getSelection();
    document.addEventListener('click', function(event) {
        switch (Visual.selection.type) {
            case "None":
                Visual.hideCursor();
                Visual.state = 0;
                break;
            case "Caret":
                if (Visual.state) {
                    Visual.hideCursor();
                    if (Visual.state === 0) {
                        Visual.state = 1;
                    }
                    Visual.showCursor();
                }
                break;
            case "Range":
                if (Visual.state) {
                    Visual.hideCursor();
                    Visual.state = 2;
                    Visual.showCursor();
                }
                break;
        }
        Normal.updateStatusBar();
    });
};
Visual.getStartPos = function() {
    var node = null,
        offset = 0;
    if (Visual.selection.anchorNode && Visual.selection.anchorNode.parentNode && Visual.selection.anchorNode.parentNode.localName !== "surfingkeys_cursor") {
        var top = $(Visual.selection.anchorNode.parentNode).offset().top;
        if (top > document.body.scrollTop && top < document.body.scrollTop + window.innerHeight) {
            node = Visual.selection.anchorNode;
            offset = Visual.selection.anchorOffset;
        }
    }
    if (!node) {
        var nodes = Visual.getTextNodes(document.body, /./);
        var anodes = nodes.filter(function(i) {
            return ($(i.parentNode).offset().top > (document.body.scrollTop + window.innerHeight / 3));
        });
        node = (anodes.length) ? anodes[0] : nodes[0];
    }
    return [node, offset];
};
Visual.toggle = function() {
    switch (Visual.state) {
        case 1:
            Visual.selection.extend(Visual.selection.anchorNode, Visual.selection.anchorOffset);
            break;
        case 2:
            Visual.hideCursor();
            Normal.ui_container.css('-webkit-user-select', '');
            Normal.ui_container.find('*').css('-webkit-user-select', '');
            Visual.selection.collapse(Visual.selection.focusNode, Visual.selection.focusOffset);
            break;
        default:
            var pos = Visual.getStartPos();
            Visual.selection.setPosition(pos[0], pos[1]);
            Normal.ui_container.css('-webkit-user-select', 'none');
            Normal.ui_container.find('*').css('-webkit-user-select', 'none');
            Visual.showCursor();
            break;
    }
    Visual.state = (Visual.state + 1) % 3;
    Normal.updateStatusBar();
};
Visual.star = function() {
    if (Visual.selection.focusNode && Visual.selection.focusNode.nodeValue) {
        Visual.hideCursor();
        var query = Visual.selection.toString();
        if (query.length === 0) {
            query = getNearestWord(Visual.selection.focusNode.nodeValue, Visual.selection.focusOffset);
        }
        Find.clear();
        Find.highlight(new RegExp(query, "g" + (Find.caseSensitive ? "" : "i")));
        Visual.showCursor();
    }
};
Visual.hideCursor = function() {
    var lastPos = Visual.cursor.parentNode;
    if (Visual.selection.focusNode && Visual.selection.focusNode.parentNode && !$(Visual.cursor).is(':visible')) {
        $(Visual.selection.focusNode.parentNode).attr('class', $(Visual.cursor).data('parentClass'));
        $(Visual.cursor).removeData('parentClass');
    }
    Visual.cursor.remove();
    if (lastPos) {
        lastPos.normalize();
    }
    return lastPos;
}
Visual.showCursor = function() {
    var ret = false;
    if ($(Visual.selection.focusNode).is(':visible') || $(Visual.selection.focusNode.parentNode).is(':visible')) {
        // https://developer.mozilla.org/en-US/docs/Web/API/Selection
        // If focusNode is a text node, this is the number of characters within focusNode preceding the focus. If focusNode is an element, this is the number of child nodes of the focusNode preceding the focus.
        if (Visual.selection.focusNode.nodeType === Node.TEXT_NODE) {
            var node = Visual.selection.focusNode;
            var pos = node.splitText(Visual.selection.focusOffset);
            node.parentNode.insertBefore(Visual.cursor, pos);
        } else {
            Visual.selection.focusNode.insertBefore(Visual.cursor, Visual.selection.focusNode.childNodes[Visual.selection.focusOffset]);
        }
        Visual.cursor.style.display = 'initial';
        var cr = Visual.cursor.getBoundingClientRect();
        if (cr.width === 0 || cr.height === 0) {
            Visual.cursor.style.display = 'inline-block';
        }
        if (!$(Visual.cursor).is(':visible')) {
            $(Visual.cursor).data('parentClass', $(Visual.selection.focusNode.parentNode).attr('class'));
            $(Visual.selection.focusNode.parentNode).attr('class', 'surfingkeys_focusnode');
        }
    }
    return ret;
};
Visual.select = function(found) {
    Visual.hideCursor();
    if (Visual.selection.anchorNode && Visual.state === 2) {
        Visual.selection.extend(found.firstChild, 0);
    } else {
        Visual.selection.setPosition(found.firstChild, 0);
    }
    Visual.showCursor();
};
Visual.getTextNodes = function(root, pattern) {
    var skip_tags = ['script', 'style', 'noscript', 'surfingkeys_mark'];
    var nodeIterator = document.createNodeIterator(
        root,
        NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (!node.data.trim() || !node.parentNode.offsetParent || skip_tags.indexOf(node.parentNode.localName.toLowerCase()) !== -1 || !pattern.test(node.data))
                    return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        }, false);

    var nodes = [];
    for (var node; node = nodeIterator.nextNode(); nodes.push(node));
    return nodes;
};
Visual.scrollIntoView = function() {
    var ff = Visual.cursor;
    var front = $(ff).offset();
    if (front.top < document.body.scrollTop || (front.top + $(ff).height()) > (document.body.scrollTop + window.innerHeight) || front.left < document.body.scrollLeft || (front.left + $(ff).width()) > (document.body.scrollLeft + window.innerWidth)) {
        window.scrollTo($(ff).offset().left, $(ff).offset().top - window.innerHeight / 2);
    }
};
Visual.yank = function() {
    var pos = [Visual.selection.anchorNode, Visual.selection.anchorOffset];
    Normal.writeClipboard(Visual.selection.toString());
    Visual.selection.setPosition(pos[0], pos[1]);
    Visual.showCursor();
};
Visual.finish = function(event) {
    Visual.map_node = Visual.mappings;
    return Normal.hideKeystroke();
};
Visual.update = function(event) {
    var updated = false;
    if (Visual.state) {
        if (event.keyCode === KeyboardUtils.keyCodes.ESC) {
            if (Visual.state > 1) {
                Visual.cursor.remove();
                Visual.selection.collapse(Visual.selection.anchorNode, Visual.selection.anchorOffset);
                Visual.showCursor();
            } else {
                Visual.hideCursor();
                Find.clear();
            }
            Visual.state--;
            Normal.updateStatusBar();
            updated = true;
        } else {
            var key = KeyboardUtils.getKeyChar(event);
            Visual.map_node = Visual.map_node.find(key);
            if (Visual.map_node === null) {
                Visual.finish();
            } else if (Visual.map_node.meta.length) {
                var code = Visual.map_node.meta[0].code;
                if (typeof(code) === 'function') {
                    code();
                } else if (typeof(code) === 'string' && code !== "") {
                    eval(code);
                } else {
                    var sel = Visual.map_node.meta[0].annotation.split(" ");
                    var alter = (Visual.state === 2) ? "extend" : "move";
                    Visual.hideCursor();
                    var prevPos = [Visual.selection.focusNode, Visual.selection.focusOffset];
                    Visual.selection.modify(alter, sel[0], sel[1]);
                    if (prevPos[0] === Visual.selection.focusNode && prevPos[1] === Visual.selection.focusOffset) {
                        Visual.selection.modify(alter, sel[0], "word");
                    }
                    Visual.showCursor();
                    Visual.scrollIntoView();
                }
                Visual.finish();
                updated = true;
            } else {
                Normal.showKeystroke(key);
                updated = true;
            }
        }
    }
    return updated;
};

function initEventListener() {
    window.stopEventPropagation = function(e, stopKeyUp) {
        e.stopImmediatePropagation();
        e.preventDefault();
        window.stopKeyupPropagation = stopKeyUp;
    };
    window.addEventListener('keydown', function(event) {
        if (!Normal.ui_container[0].contains(event.target) && Normal.init()) {
            if (event.target.localName !== 'input' && event.target.localName !== 'textarea' && !event.target.isContentEditable) {
                if (Hints.update(event) || Visual.update(event) || Normal.update(event)) {
                    window.stopEventPropagation(event, true);
                }
            }
            if (event.keyCode === KeyboardUtils.keyCodes.ESC && ['INPUT', 'TEXTAREA'].indexOf(document.activeElement.nodeName) !== -1) {
                document.activeElement.blur();
                window.stopEventPropagation(event, true);
            }
        }
    }, true);
    window.addEventListener('keyup', function(event) {
        if (window.stopKeyupPropagation) {
            event.stopImmediatePropagation();
            window.stopKeyupPropagation = false;
        }
    }, true);
    window.surfingkeys = window.location.href;
}

if (window === top) {
    initEventListener();
}
document.addEventListener('DOMContentLoaded', function() {
    if (!window.frameId && window.innerHeight * window.innerWidth > 1000 && $(document.body).find(':visible').length) {
        window.frameId = generateQuickGuid();
        RUNTIME('registerFrame', {
            frameId: window.frameId
        });
    }
    if (window !== top) {
        setTimeout(initEventListener, 300);
    }
});
