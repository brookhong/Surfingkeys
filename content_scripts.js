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
    };
    $.fn.topInView = function() {
        return this.filter(function() {
            return $(this).width() * $(this).height() > 0 && $(this).offset().top > document.body.scrollTop;
        });
    };
})(jQuery);

String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{' + i + '\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

var easeFn = function(t, b, c, d) {
    // t: current time, b: begInnIng value, c: change In value, d: duration
    return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
};

function initScroll(elm) {
    elm.scrollBy = function(x, y, d) {
        if (settings.smoothScroll && (Math.abs(x) > Normal.stepSize || Math.abs(y) > Normal.stepSize)) {
            elm.smoothScrollBy(x, y, d);
        } else {
            elm.scrollLeft = elm.scrollLeft + x;
            elm.scrollTop = elm.scrollTop + y;
        }
    };
    elm.smoothScrollBy = function(x, y, d) {
        if (window.surfingkeysHold === 0) {
            var x0 = elm.scrollLeft,
                y0 = elm.scrollTop,
                start = window.performance.now();

            function step(timestamp) {
                elm.scrollLeft = easeFn(timestamp - start, x0, x, d);
                elm.scrollTop = easeFn(timestamp - start, y0, y, d);
                if (window.surfingkeysHold !== 2 && (timestamp - start) < d) {
                    window.requestAnimationFrame(step);
                } else {
                    elm.scrollLeft = x0 + x;
                    elm.scrollTop = y0 + y;
                }
            }

            window.requestAnimationFrame(step);
            window.surfingkeysHold++;
        } else if (window.surfingkeysHold === 1) {
            function holdStep(timestamp) {
                elm.scrollLeft = elm.scrollLeft + x / 4;
                elm.scrollTop = elm.scrollTop + y / 4;
                if (window.surfingkeysHold === 2) {
                    window.requestAnimationFrame(holdStep);
                }
            }

            window.requestAnimationFrame(holdStep);
            window.surfingkeysHold++;
        }
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
    try {
        settings = resp;
        var theInstructions = resp.snippets;
        var F = new Function(theInstructions);
        F();
        if (window === top) {
            RUNTIME('setSurfingkeysIcon', {
                status: Normal.isBlacklisted()
            });
        }
    } catch (e) {
        console.log(e);
        RUNTIME("resetSettings", {
            useDefault: true
        });
    }
}

var extension_id;
var port_handlers = {
    connected: function(response) {
        extension_id = response.extension_id;
        applySettings(response.settings);
        Normal.init();
        $(document).trigger("surfingkeys:connected");
    },
    settingsUpdated: function(response) {
        applySettings(response.settings);
        Normal.renderUsage();
    }
};

function initPort() {
    var _port = chrome.runtime.connect({
        name: 'main'
    });
    _port.onMessage.addListener(function(response) {
        if (portRequest.success[response.id]) {
            var f = portRequest.success[response.id];
            delete portRequest.success[response.id];
            f(response);
        } else if (port_handlers[response.type]) {
            port_handlers[response.type](response);
        } else {
            console.log("[unexpected port message] " + JSON.stringify(response))
        }
    });
    return _port;
}
var port = initPort();

var runtime_handlers = {};
if (window === top) {
    runtime_handlers['getBlacklist'] = function(msg, sender, response) {
        response({
            "all": settings.blacklist.hasOwnProperty('.*'),
            "this": settings.blacklist.hasOwnProperty(window.location.origin),
            "origin": window.location.origin
        });
    };
    runtime_handlers['toggleBlacklist'] = function(msg, sender, response) {
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
    };
}
runtime_handlers['focusFrame'] = function(msg, sender, response) {
    if (msg.frameId === window.frameId) {
        top.surfingkeys_active_window = window;
        top.surfingkeys_active_window.focus();
        Normal.highlightDocument();
    }
};
function prepareFrames() {
    var frames = Array.prototype.slice.call(top.document.querySelectorAll('iframe')).map(function(f) {
        return f.contentWindow;
    });
    frames.unshift(top);
    frames = frames.map(function(f) {
        try {
            f.frameId = f.frameId || generateQuickGuid();
            if (f.innerWidth * f.innerHeight === 0) {
                return null;
            }
        } catch (e) {
            return null;
        }
        return f.frameId;
    });
    return frames.filter(function(f) {
        return f !== null;
    });
};
chrome.runtime.onMessage.addListener(function(msg, sender, response) {
    if (msg.target === 'content_runtime') {
        if (runtime_handlers[msg.subject]) {
            runtime_handlers[msg.subject](msg, sender, response);
        } else {
            console.log("[unexpected runtime message] " + JSON.stringify(msg))
        }
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
    prefix: "",
    clicks: ['data-ga-click', 'onclick'],
    characters: 'asdfgqwertzxcvb'
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
Hints.create = function(cssSelector, onHintKey, attrs) {
    attrs = $.extend({
        active: true,
        tabbed: false,
        multipleHits: false
    }, attrs || {});
    for (var attr in attrs) {
        Hints[attr] = attrs[attr];
    }
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
            var link = $('<div/>').css('top', pos.top).css('left', pos.left + $(this).width() / 2)
                .css('z-index', z + 2)
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
        if (Hints.tabbed || !Hints.active) {
            RUNTIME("openLink", {
                tab: {
                    tabbed: Hints.tabbed,
                    active: Hints.active
                },
                url: element.href,
                repeats: 1
            });
        } else {
            var realTargets = $(element).find('a:visible');
            realTargets = (realTargets.length) ? realTargets : $(element).find('select:visible, input:visible, textarea:visible');
            element = realTargets.length ? realTargets[0] : element;
            var events = ['mousedown', 'mouseup', 'click'];
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
                var matches = Hints.refresh();
                if (matches.length === 1) {
                    var onhint = $(matches[0]).data('onhint') || Hints.dispatchMouseClick;
                    var link = $(matches[0]).data('link');
                    onhint.call(window, link, event);
                    if (Hints.multipleHits) {
                        Hints.prefix = "";
                        Hints.refresh();
                    } else {
                        Hints.hide();
                    }
                } else if (matches.length === 0) {
                    Hints.hide();
                }
            }
        }
    }
    return updated;
};
Hints.refresh = function() {
    var matches = [];
    var hints = $('#surfingkeys_Hints').find('>div');
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
    return matches;
};
Hints.hide = function() {
    $('#surfingkeys_Hints').remove();
    Hints.prefix = "";
};

Omnibar = {
    focusedItem: 0,
    searchAliases: {},
    miniQuery: {},
};
Omnibar.init = function(container) {
    Omnibar.ui = $('<div id=surfingkeys_omnibar/>').html('<div id="surfingkeys_omnibarSearchArea"><span></span><input id=surfingkeys_omnibar_input type="text" /></div><div id="surfingkeys_omnibarSearchResult"></div>');
    Omnibar.ui.appendTo(container);
    Omnibar.input = Omnibar.ui.find('input');
    Omnibar.ui.on('click', function(event) {
        Omnibar.input[0].focus();
    });
    Omnibar.input.on('input', function() {
        Omnibar.lastInput = Omnibar.input.val();
        Omnibar.handler.onInput.call(this);
    });
    Normal.registerKeydownHandler(Omnibar.input[0].id, Omnibar.onKeydown);
    Omnibar.lastHandler = null;
};
Omnibar.onKeydown = function(event) {
    if (Omnibar.handler.onKeydown) {
        Omnibar.handler.onKeydown.call(event.target, event) && event.preventDefault();
    }
    if (event.keyCode === KeyboardUtils.keyCodes.ESC) {
        Omnibar.close();
    } else if (event.keyCode === KeyboardUtils.keyCodes.enter) {
        Omnibar.handler.activeTab = !event.ctrlKey;
        Omnibar.handler.onEnter() && Omnibar.close();
    } else if (event.keyCode === KeyboardUtils.keyCodes.space) {
        Omnibar.expandAlias($(event.target).val()) && event.preventDefault();
    } else if (event.keyCode === KeyboardUtils.keyCodes.backspace) {
        Omnibar.collapseAlias() && event.preventDefault();
    } else if (event.keyCode === KeyboardUtils.keyCodes.tab) {
        Omnibar.rotateResult(event.shiftKey);
        event.preventDefault();
    }
    return true;
};
Omnibar.scrollIntoView = function() {
    var start = $('#surfingkeys_omnibarSearchResult').position().top;
    var end = start + $('#surfingkeys_omnibarSearchResult').outerHeight();
    var focusedItem = $('#surfingkeys_omnibarSearchResult li.surfingkeys_omnibar_focused');
    var pos = focusedItem.position();
    if (pos && (pos.top < start || (pos.top + focusedItem.outerHeight()) > end)) {
        var pos = focusedItem.offset().top - $('#surfingkeys_omnibarSearchResult>ul').offset().top;
        $('#surfingkeys_omnibarSearchResult').animate({
            scrollTop: pos
        }, 100);
    }
};
Omnibar.expandAlias = function(alias) {
    var eaten = false;
    if (!Omnibar.lastHandler && alias.length && Omnibar.searchAliases.hasOwnProperty(alias)) {
        Omnibar.lastHandler = Omnibar.handler;
        Omnibar.handler = SearchEngine;
        $.extend(SearchEngine, Omnibar.searchAliases[alias]);
        $('#surfingkeys_omnibarSearchResult').html("");
        $('#surfingkeys_omnibarSearchArea>span').html(Omnibar.handler.prompt)
        Omnibar.input.val('');
        eaten = true;
    }
    return eaten;
};
Omnibar.collapseAlias = function() {
    var eaten = false;
    if (Omnibar.lastHandler && Omnibar.handler !== Omnibar.lastHandler && Omnibar.input.val() === "") {
        Omnibar.handler = Omnibar.lastHandler;
        Omnibar.lastHandler = null;
        $('#surfingkeys_omnibarSearchArea>span').html(Omnibar.handler.prompt)
        eaten = true;
    }
    return eaten;
};
Omnibar.rotateResult = function(backward) {
    var total = $('#surfingkeys_omnibarSearchResult li').length;
    if (total > 0) {
        var lastFocused = Omnibar.focusedItem;
        Omnibar.focusedItem = (backward ? (lastFocused + total) : (lastFocused + total + 2)) % (total + 1);
        $('#surfingkeys_omnibarSearchResult li:nth({0})'.format(lastFocused)).removeClass('surfingkeys_omnibar_focused');
        if (Omnibar.focusedItem < total) {
            $('#surfingkeys_omnibarSearchResult li:nth({0})'.format(Omnibar.focusedItem)).addClass('surfingkeys_omnibar_focused');
            Omnibar.handler.onTab && Omnibar.handler.onTab(Omnibar.focusedItem);
            Omnibar.scrollIntoView();
        } else {
            Omnibar.input.val(Omnibar.lastInput);
        }
    }
};
Omnibar.open = function(handler, type) {
    Omnibar.input[0].focus();
    if (handler === SearchEngine && Omnibar.searchAliases.hasOwnProperty(type)) {
        $.extend(SearchEngine, Omnibar.searchAliases[type]);
        Omnibar.lastHandler = SearchEngine;
    } else if (handler === MiniQuery && Omnibar.miniQuery.hasOwnProperty(type)) {
        $.extend(MiniQuery, Omnibar.miniQuery[type]);
        Omnibar.lastHandler = MiniQuery;
    }
    Omnibar.handler = handler;
    $('#surfingkeys_omnibarSearchArea>span').html(handler.prompt)
    Omnibar.handler.onOpen && Omnibar.handler.onOpen();
};
Omnibar.close = function() {
    var updated = false;
    if (Omnibar.ui.is(':visible')) {
        Omnibar.ui.hide();
        Omnibar.input.val('');
        $('#surfingkeys_omnibarSearchResult').html("");
        Omnibar.lastHandler = null;
        Omnibar.handler.onClose && Omnibar.handler.onClose();
        Omnibar.handler = null;
        updated = true;
    }
    return updated;
};
Omnibar.openFocused = function() {
    var ret = false,
        focusedItem = $('#surfingkeys_omnibarSearchResult li.surfingkeys_omnibar_focused');
    var folderId = focusedItem.data('folderId');
    if (folderId) {
        this.inFolder.push({
            prompt: this.prompt,
            folderId: this.folderId,
            focusedItem: Omnibar.focusedItem
        });
        this.prompt = focusedItem.data('folder_name') + "≫";
        $('#surfingkeys_omnibarSearchArea>span').html(this.prompt)
        Omnibar.input.val('');
        this.folderId = folderId;
        port.postMessage({
            action: 'getBookmarks',
            parentId: this.folderId
        });
    } else {
        var url = focusedItem.find('div.surfingkeys_omnibar_url').data('url');
        if (/^javascript:/.test(url)) {
            window.location.href = url;
        } else {
            if (url && url.length) {
                RUNTIME("openLink", {
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
    }
    return ret;
};
Omnibar.listResults = function(items, renderItem) {
    var results = $("<ul/>");
    items.forEach(function(b) {
        renderItem(b).appendTo(results);
    });
    var fi = Omnibar.focusedItem || 0;
    results.find('li:nth({0})'.format(fi)).addClass('surfingkeys_omnibar_focused');
    Omnibar.focusedItem = fi;
    $('#surfingkeys_omnibarSearchResult').html("");
    results.appendTo('#surfingkeys_omnibarSearchResult');
};
Omnibar.listBookmark = function(items, showFolder) {
    Omnibar.listResults(items, function(b) {
        var li = $('<li/>');
        if (b.hasOwnProperty('url')) {
            var type = b.type || (b.hasOwnProperty('lastVisitTime') ? "☼" : "☆");
            b.title = (b.title && b.title !== "") ? b.title : b.url;
            li.html('<div class="surfingkeys_omnibar_title">{1} {0}</div>'.format(b.title, type));
            $('<div class="surfingkeys_omnibar_url">').data('url', b.url).html(b.url).appendTo(li);
        } else if (showFolder) {
            li.html('<div class="surfingkeys_omnibar_title">▷ {0}</div>'.format(b.title)).data('folder_name', b.title).data('folderId', b.id);
        }
        return li;
    });
};
Omnibar.listWords = function(words) {
    var results = $("<ul/>");
    words.forEach(function(w) {
        var li = $('<li/>').html("⌕ " + w).data('query', w);
        li.appendTo(results);
    });
    $('#surfingkeys_omnibarSearchResult').html("");
    results.appendTo('#surfingkeys_omnibarSearchResult');
    Omnibar.focusedItem = words.length;
};
Omnibar.html = function(content) {
    $('#surfingkeys_omnibarSearchResult').html(content);
};

OpenBookmarks = {
    prompt: 'bookmark≫',
    inFolder: [],
    folderOnly: false,
    onOpen: function() {
        port.postMessage({
            action: 'getBookmarks'
        });
    },
    onClose: function() {
        OpenBookmarks.inFolder = [];
        OpenBookmarks.prompt = "bookmark≫";
        delete OpenBookmarks.folderId;
        Omnibar.focusedItem = 0;
    }
};
Omnibar.onFolderUp = function(handler, message) {
    var fl = handler.inFolder.pop();
    if (fl.folderId) {
        handler.folderId = fl.folderId;
        port.postMessage({
            action: 'getBookmarks',
            parentId: handler.folderId
        });
    } else {
        delete handler.folderId;
        port.postMessage(message);
    }
    handler.prompt = fl.prompt;
    $('#surfingkeys_omnibarSearchArea>span').html(handler.prompt)
    Omnibar.focusedItem = fl.focusedItem;
    eaten = true;
};
OpenBookmarks.onEnter = Omnibar.openFocused.bind(OpenBookmarks);
OpenBookmarks.onKeydown = function(event) {
    var eaten = false;
    if (event.keyCode === KeyboardUtils.keyCodes.comma) {
        OpenBookmarks.folderOnly = !OpenBookmarks.folderOnly;
        OpenBookmarks.prompt = OpenBookmarks.folderOnly ? "bookmark folder≫" : "bookmark≫";
        $('#surfingkeys_omnibarSearchArea>span').html(OpenBookmarks.prompt)
        port.postMessage({
            action: 'getBookmarks',
            parentId: OpenBookmarks.folderId,
            query: $(this).val()
        });
        eaten = true;
    } else if (event.keyCode === KeyboardUtils.keyCodes.backspace && OpenBookmarks.inFolder.length && !$(this).val().length) {
        Omnibar.onFolderUp(OpenBookmarks, {
            action: 'getBookmarks'
        });
        eaten = true;
    } else if (event.ctrlKey && KeyboardUtils.isWordChar(event)) {
        var focusedURL = $('#surfingkeys_omnibarSearchResult li.surfingkeys_omnibar_focused>div.surfingkeys_omnibar_url');
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
        action: 'getBookmarks',
        parentId: OpenBookmarks.folderId,
        query: $(this).val()
    });
};
port_handlers['getBookmarks'] = function(response) {
    var items = response.bookmarks;
    if (OpenBookmarks.folderOnly) {
        items = items.filter(function(b) {
            return !b.hasOwnProperty('url');
        });
    }
    Omnibar.listBookmark(items, true);
    Omnibar.scrollIntoView();
};

OpenHistory = {
    prompt: 'history≫'
};
OpenHistory.onEnter = Omnibar.openFocused.bind(OpenHistory);
OpenHistory.onInput = function() {
    port.postMessage({
        action: 'getHistory',
        query: {
            startTime: 0,
            maxResults: settings.maxResults,
            text: $(this).val()
        }
    });
};
port_handlers['getHistory'] = function(response) {
    Omnibar.listBookmark(response.history, false);
};

OpenURLs = {
    prompt: '≫'
};
OpenURLs.onEnter = Omnibar.openFocused.bind(OpenURLs);
OpenURLs.onInput = function() {
    port.postMessage({
        action: 'getURLs',
        maxResults: settings.maxResults,
        query: $(this).val()
    });
};
port_handlers['getURLs'] = function(response) {
    Omnibar.listBookmark(response.urls, false);
};

OpenTabs = {
    prompt: 'tabs≫'
};
OpenTabs.onEnter = function() {
    var focusedItem = $('#surfingkeys_omnibarSearchResult li.surfingkeys_omnibar_focused');
    RUNTIME('focusTab', {
        tab_id: focusedItem.data('tabId')
    });
    return true;
};
OpenTabs.list = function(query) {
    portRequest({
        action: 'getTabs',
        query: query
    }, function(response) {
        Omnibar.listResults(response.tabs, function(b) {
            var li = $('<li/>').data('tabId', b.id);
            li.html('<div class="surfingkeys_omnibar_title">▤ {0}</div>'.format(b.title));
            $('<div class="surfingkeys_omnibar_url">').html(b.url).appendTo(li);
            return li;
        });
    });
};
OpenTabs.onOpen = function() {
    OpenTabs.list('');
};
OpenTabs.onInput = function() {
    OpenTabs.list($(this).val());
};

OpenVIMarks = {
    prompt: 'VIMarks≫',
    onOpen: function() {
        var query = Omnibar.input.val();
        var urls = [];
        for (var m in settings.marks) {
            if (query === "" || settings.marks[m].indexOf(query) !== -1) {
                urls.push({
                    title: m,
                    type: '♡',
                    url: settings.marks[m]
                });
            }
        }
        Omnibar.listBookmark(urls, false);
    }
};
OpenVIMarks.onEnter = Omnibar.openFocused.bind(OpenVIMarks);
OpenVIMarks.onInput = OpenVIMarks.onOpen;

StatusBar = {};
StatusBar.init = function(container) {
    StatusBar.ui = $('<div id=surfingkeys_status/>').html("<span/><span/><span/><span/>");
    StatusBar.ui.appendTo(container);
};
StatusBar.show = function(n, content) {
    var span = StatusBar.ui.find('span');
    if (n < 0) {
        span.html("");
    } else {
        $(span[n]).html("").append(content);
    }
    var lastSpan = -1;
    for (var i = 0; i < span.length; i++) {
        if ($(span[i]).html().length) {
            lastSpan = i;
            $(span[i]).css('padding', '0px 8px');
            $(span[i]).css('border-right', '1px solid #999');
        } else {
            $(span[i]).css('padding', '');
            $(span[i]).css('border-right', '');
        }
    }
    $(span[lastSpan]).css('border-right', '');
    StatusBar.ui.css('display', lastSpan === -1 ? 'none' : 'block');
};

Find = {
    caseSensitive: false,
    status: '',
    matches: [],
    history: [],
    mark_template: $('<surfingkeys_mark>')[0],
    input: $('<input id="surfingkeys_find"/>')
};
Find.initFocus = function() {
    if (Find.matches.length) {
        Find.focused = 0;
        for (var i = 0; i < Find.matches.length; i++) {
            var br = Find.matches[i].getBoundingClientRect();
            if (br.top > 0 && br.left > 0) {
                Find.focused = i;
                StatusBar.show(3, Find.focused + 1 + ' / ' + Find.matches.length);
                break;
            }
        }
    }
};
Find.next = function(backward) {
    if (Find.matches.length) {
        Find.focused = (backward ? (Find.matches.length + Find.focused - 1) : (Find.focused + 1)) % Find.matches.length;
        Visual.select(Find.matches[Find.focused]);
        StatusBar.show(3, Find.focused + 1 + ' / ' + Find.matches.length);
    } else if (settings.findHistory.length) {
        var query = settings.findHistory[0];
        Find.highlight(new RegExp(query, "g" + (Find.caseSensitive ? "" : "i")));
        if (Find.matches.length) {
            Visual.state = 1;
            StatusBar.show(2, Visual.status[Visual.state]);
            Visual.hideCursor();
            Visual.select(Find.matches[Find.focused]);
        }
    }
};
Find.open = function() {
    Find.historyInc = 0;
    StatusBar.show(0, "/");
    StatusBar.show(1, Find.input);
    Find.input.on('input', function() {
        Visual.hideCursor();
        Find.clear();
        var query = $(this).val();
        if (query.length > 0 && (query[0].charCodeAt(0) > 0x7f || query.length > 2)) {
            Find.highlight(new RegExp(query, "g" + (Find.caseSensitive ? "" : "i")));
        }
    });
    Normal.registerKeydownHandler(Find.input[0].id, Find.onKeydown);
    Find.input.focus();
};
Find.close = function() {
    Find.input.val('');
    StatusBar.show(-1, '');
};
Find.updateHistory = function(query) {
    if (query !== settings.findHistory[0]) {
        settings.findHistory.unshift(query);
        if (settings.findHistory.length > 50) {
            settings.findHistory.pop();
        }
        RUNTIME('updateSettings', {
            settings: {
                findHistory: settings.findHistory
            }
        });
    }
};
Find.onKeydown = function(event) {
    var eaten = true;
    if (event.keyCode === KeyboardUtils.keyCodes.ESC) {
        Find.clear();
        Find.close();
    } else if (event.keyCode === KeyboardUtils.keyCodes.enter) {
        var query = Find.input.val();
        Find.updateHistory(query);
        if (Find.matches.length) {
            setTimeout(function() {
                Find.close();
                document.activeElement.blur();
                Visual.state = 1;
                Visual.select(Find.matches[Find.focused]);
                StatusBar.show(2, Visual.status[Visual.state]);
            }, 0);
        } else {
            StatusBar.show(3, "Pattern not found: {0}".format(query));
        }
    } else if (event.keyCode === KeyboardUtils.keyCodes.upArrow || event.keyCode === KeyboardUtils.keyCodes.downArrow) {
        if (settings.findHistory.length) {
            Find.historyInc = (event.keyCode === KeyboardUtils.keyCodes.upArrow) ? (Find.historyInc + 1) : (Find.historyInc + settings.findHistory.length - 1);
            Find.historyInc = Find.historyInc % settings.findHistory.length;
            var query = settings.findHistory[Find.historyInc];
            Find.input.val(query);
            Visual.hideCursor();
            Find.clear();
            Find.highlight(new RegExp(query, "g" + (Find.caseSensitive ? "" : "i")));
        }
    } else {
        eaten = false;
    }
    return eaten;
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
    StatusBar.show(3, '');
};

SearchEngine = {
    onClose: function() {
        SearchEngine.prompt = undefined;
        SearchEngine.url = undefined;
        SearchEngine.suggestionURL = undefined;
        SearchEngine.listSuggestion = undefined;
    }
};
SearchEngine.onTab = function() {
    Omnibar.input.val($('#surfingkeys_omnibarSearchResult li:nth({0})'.format(Omnibar.focusedItem)).data('query'));
};
SearchEngine.onEnter = function() {
    var suggestion = $('#surfingkeys_omnibarSearchResult li.surfingkeys_omnibar_focused').data('query');
    var url = SearchEngine.url + (suggestion || Omnibar.input.val());
    tabOpenLink(url);
    return true;
};
SearchEngine.onInput = function() {
    if (SearchEngine.suggestionURL) {
        httpRequest({
            url: SearchEngine.suggestionURL + $(this).val()
        }, SearchEngine.listSuggestion);
    }
};

Commands = {
    prompt: ':',
    historyInc: 0,
    items: {},
    onOpen: function() {
        var cmd = Omnibar.input.val();
        var candidates = Object.keys(Commands.items).filter(function(c) {
            return cmd === "" || c.indexOf(cmd) !== -1;
        });
        Omnibar.listResults(candidates, function(c) {
            return $('<li/>').data('cmd', c).html("{0}<span class=surfingkeys_omnibar_annotation>{1}</span>".format(c, Commands.items[c].annotation));
        });
    }
};
Commands.onInput = Commands.onOpen;
Commands.onTab = function() {
    Omnibar.input.val($('#surfingkeys_omnibarSearchResult li:nth({0})'.format(Omnibar.focusedItem)).data('cmd'));
};
Commands.parse = function(cmdline) {
    var cmdline = cmdline.trim();
    var tokens = [];
    var pendingToken = false;
    var part = '';
    for(var i=0; i < cmdline.length; i++) {
        if(cmdline.charAt(i) === ' ' && !pendingToken) {
            tokens.push(part);
            part = '';
        } else {
            if(cmdline.charAt(i) === '\"') {
                pendingToken = !pendingToken;
            } else {
                part += cmdline.charAt(i);
            }
        }
    }
    tokens.push(part);
    return tokens;
};
Commands.updateHistory = function(cmd) {
    if (cmd !== settings.cmdHistory[0]) {
        settings.cmdHistory.unshift(cmd);
        if (settings.cmdHistory.length > 50) {
            settings.cmdHistory.pop();
        }
        RUNTIME('updateSettings', {
            settings: {
                cmdHistory: settings.cmdHistory
            }
        });
    }
};
Commands.onKeydown = function(event) {
    var eaten = false;
    if (event.keyCode === KeyboardUtils.keyCodes.upArrow || event.keyCode === KeyboardUtils.keyCodes.downArrow) {
        if (settings.cmdHistory.length) {
            Commands.historyInc = (event.keyCode === KeyboardUtils.keyCodes.upArrow) ? (Commands.historyInc + 1) : (Commands.historyInc + settings.cmdHistory.length - 1);
            Commands.historyInc = Commands.historyInc % settings.cmdHistory.length;
            Omnibar.input.val(settings.cmdHistory[Commands.historyInc]);
        }
        eaten = true;
    }
    return eaten;
};
Commands.onEnter = function() {
    var ret = false;
    var cmdline = Omnibar.input.val();
    Commands.updateHistory(cmdline);
    var args = Commands.parse(cmdline);
    var cmd = args.shift();
    if (Commands.items.hasOwnProperty(cmd)) {
        var code = Commands.items[cmd].code;
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
    return ret;
};

MiniQuery = {};
MiniQuery.onInput = function() {};
MiniQuery.onEnter = function() {
    var q = Omnibar.input.val();
    if (q.length) {
        httpRequest({
            url: MiniQuery.url + q
        }, MiniQuery.listResult);
    }
    return false;
};

function command(cmd, annotation, jscode, extra_chars, domain) {
    if (!domain || domain.test(window.location.origin)) {
        if (typeof(jscode) === 'string') {
            jscode = new Function(jscode);
        }
        Commands.items[cmd] = {
            code: jscode,
            annotation: annotation
        };
    }
};
function _mapkey(mode, keys, annotation, jscode, extra_chars, domain) {
    if (!domain || domain.test(window.location.origin)) {
        mode.mappings.remove(keys);
        if (typeof(jscode) === 'string') {
            jscode = new Function(jscode);
        }
        mode.mappings.add(keys, {
            code: jscode,
            annotation: annotation,
            extra_chars: extra_chars
        });
    }
}

function mapkey(keys, annotation, jscode, extra_chars, domain) {
    _mapkey(Normal, keys, annotation, jscode, extra_chars, domain);
}

function vmapkey(keys, annotation, jscode, extra_chars, domain) {
    jscode = jscode || Visual.modifySelection;
    _mapkey(Visual, keys, annotation, jscode, extra_chars, domain);
}

function map(new_keystroke, old_keystroke, domain) {
    if (!domain || domain.test(window.location.origin)) {
        var old_map = Normal.mappings.find(old_keystroke);
        if (old_map) {
            var meta = old_map.meta[0];
            Normal.mappings.remove(old_keystroke);
            Normal.mappings.add(new_keystroke, {
                code: meta.code,
                annotation: meta.annotation,
                extra_chars: meta.extra_chars
            });
        }
    }
}

function unmap(keystroke, domain) {
    if (!domain || domain.test(window.location.origin)) {
        Normal.mappings.remove(keystroke);
    }
}

function addSearchAlias(alias, prompt, url, suggestionURL, listSuggestion) {
    Omnibar.searchAliases[alias] = {
        prompt: prompt + "≫",
        url: url,
        suggestionURL: suggestionURL,
        listSuggestion: listSuggestion
    };
}

function addSearchAliasX(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion, only_this_site_key) {
    addSearchAlias(alias, prompt, search_url, suggestion_url, callback_to_parse_suggestion);
    mapkey((search_leader_key || 's') + alias, 'Search selected with ' + prompt, 'searchSelectedWith("{0}")'.format(search_url));
    vmapkey((search_leader_key || 's') + alias, 'Search selected with ' + prompt, 'searchSelectedWith("{0}")'.format(search_url));
    mapkey((search_leader_key || 's') + (only_this_site_key || 'o') + alias, 'Search selected only in this site with ' + prompt, 'searchSelectedWith("{0}", true)'.format(search_url));
    vmapkey((search_leader_key || 's') + (only_this_site_key || 'o') + alias, 'Search selected only in this site with ' + prompt, 'searchSelectedWith("{0}", true)'.format(search_url));
}

function walkPageUrl(step) {
    var numbers = window.location.href.match(/^(.*\/[^\/\d]*)(\d+)$/);
    if (numbers && numbers.length === 3) {
        window.location.href = numbers[1] + (parseInt(numbers[2]) + step);
    }
}

function addMiniQuery(alias, prompt, url, listResult) {
    Omnibar.miniQuery[alias] = {
        prompt: prompt + "≫",
        url: url,
        listResult: listResult
    };
}

function tabOpenLink(url) {
    url = /^\w+:\/\/\w+/i.test(url) ? url : 'https://www.google.com/search?q=' + url;
    RUNTIME("openLink", {
        tab: {
            tabbed: true
        },
        position: settings.newTabPosition,
        url: url,
        repeats: 1
    });
}

function searchSelectedWith(se, onlyThisSite) {
    var query = window.getSelection().toString() || Normal.getContentFromClipboard();
    if (onlyThisSite) {
        query += " site:" + window.location.hostname;
    }
    tabOpenLink(se + encodeURI(query));
}

function htmlEncode(str){
  return $('<div/>').text(str).html();
}

function htmlDecode(str){
  return $('<div/>').html(str).text();
}

function clickOn(links) {
    var ret = false;
    if (typeof(links) === 'string') {
        links = $(links);
    }
    if (links.length && links.length > 0) {
        links = links[0];
    }
    if (links.nodeType === Node.ELEMENT_NODE) {
        Hints.dispatchMouseClick(links);
        ret = true;
    }
    return ret;
}

function generateQuickGuid() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

portRequest = (function() {
    var _imp = function(args, success) {
        args.id = generateQuickGuid();
        port.postMessage(args);
        _imp.success[args.id] = success;
    }
    _imp.success = {};
    return _imp;
})();

httpRequest = function(args, success) {
    portRequest({
        action: 'request',
        method: args.method || 'get',
        url: args.url
    }, success);
};

function _handleMapKey(mode, key) {
    var ret = false;
    if (mode.pendingMap) {
        setTimeout(function() {
            mode.pendingMap(key);
            mode.finish();
        }, 0);
        ret = true;
    } else {
        mode.map_node = mode.map_node.find(key);
        if (mode.map_node === null) {
            mode.finish();
            ret = false;
        } else {
            if (mode.map_node.meta.length) {
                var code = mode.map_node.meta[0].code;
                if (typeof(code) === 'function') {
                    if (mode.map_node.meta[0].extra_chars) {
                        mode.pendingMap = code;
                        Normal.showKeystroke(key);
                    } else {
                        setTimeout(function() {
                            code();
                            mode.finish();
                        }, 0);
                    }
                }
            } else {
                Normal.showKeystroke(key);
            }
            ret = true;
        }
    }
    return ret;
}

Normal = {
    mappings: null,
    stepSize: 70,
    scrollIndex: 0,
    keydownHandlers: {},
};
Normal.mappings = new Trie('', Trie.SORT_NONE);
Normal.map_node = Normal.mappings;
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
    } else {
        Normal.scrollNodes = Normal.scrollNodes.filter(function(n) {
            return $(n).is(":visible");
        });
        if (Normal.scrollIndex >= Normal.scrollNodes.length) {
            Normal.scrollIndex = 0;
        }
    }
    if (Normal.scrollNodes.length === 0) {
        return;
    }
    var scrollNode = Normal.scrollNodes[Normal.scrollIndex];
    if (!scrollNode.scrollBy) {
        initScroll(scrollNode);
    }
    var size = (scrollNode === document.body) ? [window.innerWidth, window.innerHeight] : [scrollNode.offsetWidth, scrollNode.offsetHeight];
    repeats = repeats || 1;
    switch (type) {
        case 'down':
            scrollNode.scrollBy(0, repeats * Normal.stepSize, 500);
            break;
        case 'up':
            scrollNode.scrollBy(0, -repeats * Normal.stepSize, 500);
            break;
        case 'pageDown':
            scrollNode.scrollBy(0, repeats * size[1] / 2, 500);
            break;
        case 'fullPageDown':
            scrollNode.scrollBy(0, repeats * size[1], 500);
            break;
        case 'pageUp':
            scrollNode.scrollBy(0, -repeats * size[1] / 2, 500);
            break;
        case 'fullPageUp':
            scrollNode.scrollBy(0, -repeats * size[1], 500);
            break;
        case 'top':
            scrollNode.scrollBy(0, -scrollNode.scrollTop, 500);
            break;
        case 'bottom':
            scrollNode.scrollBy(scrollNode.scrollLeft, scrollNode.scrollHeight - scrollNode.scrollTop, 500);
            break;
        case 'left':
            scrollNode.scrollBy(repeats * -Normal.stepSize / 2, 0, 500);
            break;
        case 'right':
            scrollNode.scrollBy(repeats * Normal.stepSize / 2, 0, 500);
            break;
        case 'leftmost':
            scrollNode.scrollBy(-scrollNode.scrollLeft - 10, 0, 500);
            break;
        case 'rightmost':
            scrollNode.scrollBy(scrollNode.scrollWidth - scrollNode.scrollLeft - size[0] + 20, 0, 500);
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
            action: 'getSettings'
        });
    }
    var blacklisted = Normal.isBlacklisted();
    if (document.designMode === 'on') {
        $(document).find('div.surfingkeys_css_reset').remove();
        Normal.ui_container = null;
    } else if (!blacklisted && !Normal.ui_container) {
        $(document).find('div.surfingkeys_css_reset').remove();
        Normal.ui_container = $('<div class=surfingkeys_css_reset/>').css('z-index', 999);
        document.lastElementChild.appendChild(Normal.ui_container[0]);
        Normal.clipboard_holder = $('<textarea/>').attr('surfingkeys', 1).css('position', 'fixed').css('z-index', '-999')
            .css('top', '0').css('left', '0').css('opacity', '0');
        Normal.keystroke = $('<div id=surfingkeys_keystroke/>');
        Normal.keystroke.appendTo(Normal.ui_container);
        Normal.popover = $('<div id=surfingkeys_popover/>');
        Normal.popover.appendTo(Normal.ui_container);
        Normal.frameElement = $("<div class=surfingkeys_frame>");
        Normal._tabs = $("<div class=surfingkeys_tabs><div class=surfingkeys_tabs_fg></div><div class=surfingkeys_tabs_bg></div></div>").appendTo(Normal.ui_container);
        Normal._bubble = $("<div class=surfingkeys_bubble>").html("<div class=surfingkeys_bubble_content></div>").appendTo(Normal.ui_container);
        $("<div class=surfingkeys_arrow>").html("<div class=surfingkeys_arrowdown></div><div class=surfingkeys_arrowdown_inner></div>").css('position', 'absolute').css('top', '100%').appendTo(Normal._bubble);
        Normal.usage = $('<div id=surfingkeys_Usage/>');
        Normal.usage.appendTo(Normal.ui_container);
        Visual.init();
        Normal.renderUsage();
        StatusBar.init(Normal.ui_container);
        Omnibar.init(Normal.ui_container);
        document.lastElementChild.appendChild(Normal.ui_container[0]);
    } else if ($('body').find('div.surfingkeys_css_reset').length === 0 && Normal.ui_container) {
        Normal.ui_container.appendTo('body');
    }
    return !blacklisted && Normal.ui_container;
};
Normal.registerKeydownHandler = function(elm, handler) {
    Normal.keydownHandlers[elm] = handler;
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
        }, 300, function() {
            Normal.popover.html("");
        });
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
Normal.highlightElement = function(elm, lapse) {
    var pos = $(elm).offset();
    Normal.frameElement.css('top', pos.top).css('left', pos.left).css('width', $(elm).width()).css('height', $(elm).height()).appendTo('body');
    setTimeout(function() {
        Normal.frameElement.remove();
    }, lapse || 200);
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
        $("<tr><td class=keyboard><kbd>{0}</kbd></td><td class=surfingkeys_omnibar_annotation>{1}</td><td class=keyboard><kbd>{2}</kbd></td><td class=surfingkeys_omnibar_annotation>{3}</td></tr>".format(words[i], mappings.find(words[i]).meta[0].annotation, words[i + 1], mappings.find(words[i + 1]).meta[0].annotation)).appendTo(tb);
    }
    if (left) {
        var w = words[words.length - 1];
        $("<tr><td class=keyboard><kbd>{0}</kbd></td><td class=surfingkeys_omnibar_annotation>{1}</td><td></td><td></td></tr>".format(w, mappings.find(w).meta[0].annotation)).appendTo(tb);
    }
    return tb;
};
Normal.renderUsage = function() {
    Normal.usage.html("");
    Normal.renderMappings(Normal.mappings).appendTo(Normal.usage);
    var moreHelp = $("<p style='float:right; width:100%; text-align:right'>").html("<a href='#' style='color:#0095dd'>Show Mappings in Visual mode</a> | <a href='https://github.com/brookhong/surfingkeys' target='_blank' style='color:#0095dd'>More help</a>").appendTo(Normal.usage);
    moreHelp.find('a:nth(0)').on('click', function() {
        $('#surfingkeys_Usage .surfingkeys_VisualUsage').toggle();
    });
    Normal.renderMappings(Visual.mappings).attr('class', 'surfingkeys_VisualUsage').appendTo(Normal.usage).hide();
};
Normal.showUsage = function() {
    if (Normal.usage) {
        Normal.hide();
        Normal.show(Normal.usage);
    }
};
Normal.openOmnibar = function(handler, type) {
    Omnibar.lastInput = "";
    Normal.hide();
    Normal.show(Omnibar.ui);
    Omnibar.open(handler, type);
};
Normal.hide = function() {
    var updated = false;
    if (Normal._display && Normal._display.is(':visible')) {
        Normal._display.hide();
        Normal._display.close && Normal._display.close();
        updated = true;
    }
    return updated;
};
Normal.show = function(toDisplay) {
    Normal._display = toDisplay;
    Normal._display.show();
};
port_handlers['getTabs'] = function(response) {
    if (response.tabs.length > settings.tabsThreshold) {
        Normal.openOmnibar(OpenTabs);
    } else {
        var tabs_fg = Normal._tabs.find('div.surfingkeys_tabs_fg');
        tabs_fg.html("");
        Normal._tabs.trie = new Trie('', Trie.SORT_NONE);
        var hintLabels = Hints.genLabels(response.tabs.length);
        var tabstr = "<div class=surfingkeys_tab style='max-width: {0}px'>".format(window.innerWidth - 50);
        var items = response.tabs.forEach(function(t, i) {
            var tab = $(tabstr);
            Normal._tabs.trie.add(hintLabels[i].toLowerCase(), t.id);
            tab.html("<div class=surfingkeys_tab_hint>{0}</div><div class=surfingkeys_tab_title>{1}</div>".format(hintLabels[i], t.title));
            tab.data('url', t.url);
            tabs_fg.append(tab);
        })
        Normal.show(Normal._tabs);
        tabs_fg.find('div.surfingkeys_tab').each(function() {
            $(this).css('width', $(this).width() + 10);
            $(this).append($("<div class=surfingkeys_tab_url>{0}</div>".format($(this).data('url'))));
        });
        Normal._tabs.find('div.surfingkeys_tabs_bg').css('width', window.innerWidth).css('height', window.innerHeight);
    }
};
Normal.chooseTab = function() {
    Normal.hide();
    port.postMessage({
        action: 'getTabs'
    });
};
Normal.getContentFromClipboard = function() {
    var result = '';
    Normal.clipboard_holder.appendTo(Normal.ui_container);
    var clipboard_holder = Normal.clipboard_holder[0];
    clipboard_holder.value = '';
    clipboard_holder.select();
    if (document.execCommand('paste')) {
        result = clipboard_holder.value;
    }
    clipboard_holder.value = '';
    Normal.clipboard_holder.remove();
    return result;
};
Normal.writeClipboard = function(text) {
    Normal.clipboard_holder.appendTo(Normal.ui_container);
    var clipboard_holder = Normal.clipboard_holder[0];
    clipboard_holder.value = text;
    clipboard_holder.select();
    document.execCommand('copy');
    clipboard_holder.value = '';
    Normal.clipboard_holder.remove();
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
                right: 0
            }, 300);
        }
    }
};
Normal.hideKeystroke = function() {
    var ret = false;
    if (Normal.keystroke) {
        Normal.keystroke.animate({
            right: "-2rem"
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
            updated = Normal.hide() || Normal.finish();
            break;
        case KeyboardUtils.keyCodes.ctrlKey:
        case KeyboardUtils.keyCodes.shiftKey:
            break;
        default:
            var key = KeyboardUtils.getKeyChar(event);
            if (Normal._tabs.is(':visible')) {
                Normal._tabs.trie = Normal._tabs.trie.find(key);
                if (!Normal._tabs.trie) {
                    Normal.hide();
                    Normal._tabs.trie = null;
                } else if (Normal._tabs.trie.meta.length) {
                    RUNTIME('focusTab', {
                        tab_id: Normal._tabs.trie.meta[0]
                    });
                    Normal.hide();
                    Normal._tabs.trie = null;
                }
                updated = true;
            } else {
                updated = _handleMapKey(Normal, key);
            }
            break;
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
        RUNTIME("openLink", {
            tab: {
                tabbed: false,
                active: true
            },
            url: settings.marks[mark]
        });
    } else {
        Normal.popup("No mark '{0}' defined.".format(mark));
    }
};
Normal.resetSettings = function() {
    RUNTIME("resetSettings");
    Normal.popup("Settings reset.");
};
Normal.insertJS = function(url) {
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = url;
    document.lastElementChild.appendChild(s);
};
Normal.moveTab = function(pos) {
    RUNTIME('moveTab', {
        position: pos
    });
};

Visual = {
    state: 0,
    auto: false,
    status: ['', 'Caret', 'Range'],
    focus: null,
    cursor: $('<div class="surfingkeys_cursor"/>')[0],
};
Visual.mappings = new Trie('', Trie.SORT_NONE);
Visual.map_node = Visual.mappings;
Visual.initMappings = function() {
    vmapkey("l", "forward character");
    vmapkey("h", "backward character");
    vmapkey("j", "forward line");
    vmapkey("k", "backward line");
    vmapkey("w", "forward word");
    vmapkey("e", "forward word");
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
    Visual.initMappings();
    Visual.selection = document.getSelection();
    document.addEventListener('click', function(event) {
        Visual.focus = event.target;
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
        StatusBar.show(2, Visual.status[Visual.state]);
    });
};
Visual.expand = function() {
    Visual.focus = Visual.focus.parentElement;
    Normal.highlightElement(Visual.focus, 1000);
};
Visual.getStartPos = function() {
    var node = null,
        offset = 0;
    if (Visual.selection.anchorNode && Visual.selection.anchorNode.parentNode && Visual.selection.anchorNode.parentNode.className !== "surfingkeys_cursor") {
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
    StatusBar.show(2, Visual.status[Visual.state]);
};
Visual.star = function() {
    if (Visual.selection.focusNode && Visual.selection.focusNode.nodeValue) {
        Visual.hideCursor();
        var query = Visual.selection.toString();
        if (query.length === 0) {
            query = getNearestWord(Visual.selection.focusNode.nodeValue, Visual.selection.focusOffset);
        }
        Find.updateHistory(query);
        Find.clear();
        Find.highlight(new RegExp(query, "g" + (Find.caseSensitive ? "" : "i")));
        Visual.showCursor();
    }
};
Visual.hideCursor = function() {
    var lastPos = Visual.cursor.parentNode;
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
    Visual.scrollIntoView();
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
Visual.modifySelection = function() {
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
    Visual.finish();
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
            StatusBar.show(2, Visual.status[Visual.state]);
            updated = true;
        } else {
            var key = KeyboardUtils.getKeyChar(event);
            updated = _handleMapKey(Visual, key);
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
        if (Normal.init()) {
            if (Normal.ui_container[0].contains(event.target)) {
                var handler = Normal.keydownHandlers[event.target.id];
                if (handler && handler(event)) {
                    event.stopImmediatePropagation();
                }
            } else {
                if (event.target.localName !== 'input' && event.target.localName !== 'textarea' && event.target.localName !== 'select' && !event.target.isContentEditable) {
                    if (Hints.update(event) || Visual.update(event) || Normal.update(event)) {
                        window.stopEventPropagation(event, true);
                    }
                }
                if (event.keyCode === KeyboardUtils.keyCodes.ESC && ['INPUT', 'TEXTAREA'].indexOf(document.activeElement.nodeName) !== -1) {
                    document.activeElement.blur();
                    window.stopEventPropagation(event, true);
                }
            }
        }
    }, true);
    window.surfingkeysHold = 0;
    window.addEventListener('keyup', function(event) {
        window.surfingkeysHold = 0;
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
    if (window !== top) {
        setTimeout(initEventListener, 300);
    }
});
