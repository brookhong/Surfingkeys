const Utils = (function () {
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
    // Lastly, posting a message to a page at a file: URL currently requires that the targetOrigin argument be "*".
    // file:// cannot be used as a security restriction; this restriction may be modified in the future.
    function getDocumentOrigin () {
        return (document.origin === "null" ? "*" : document.origin);
    }

    function timeStampString(t) {
        var dt = new Date();
        dt.setTime(t);
        return dt.toLocaleString();
    }

    function generateQuickGuid() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    function htmlEncode(str) {
        return $('<div/>').text(str).html();
    }

    function htmlDecode(str) {
        return $('<div/>').html(str).text();
    }

    function getRealEdit(event) {
        var rt = event ? event.target : document.activeElement;
        if (rt && rt.shadowRoot) {
            if (rt.shadowRoot.activeElement) {
                rt = rt.shadowRoot.activeElement;
            } else if (rt.shadowRoot.querySelector('input, textarea, select')) {
                rt = rt.shadowRoot.querySelector('input, textarea, select');
            }
        }
        return rt;
    }

    function isEditable(element) {
        return element.localName === 'textarea'
            || element.localName === 'select'
            || element.isContentEditable
            || (element.localName === 'input' && /^(?!button|checkbox|file|hidden|image|radio|reset|submit)/i.test(element.type));
    }

    function parseQueryString(query) {
        var params = {};
        if (query.length) {
            var parts = query.split('&');
            for (var i = 0, ii = parts.length; i < ii; ++i) {
                var param = parts[i].split('=');
                var key = param[0].toLowerCase();
                var value = param.length > 1 ? param[1] : null;
                params[decodeURIComponent(key)] = decodeURIComponent(value);
            }
        }
        return params;
    }

    return {
        getDocumentOrigin,
        timeStampString,
        generateQuickGuid,
        htmlEncode,
        htmlDecode,
        getRealEdit,
        isEditable,
        parseQueryString
    };
})();



function reportIssue(title, description) {
    title = encodeURIComponent(title);
    description = "%23%23+Error+details%0A%0A{0}%0A%0ASurfingKeys%3A+{1}%0A%0AChrome%3A+{2}%0A%0AURL%3A+{3}%0A%0A%23%23+Context%0A%0A%2A%2APlease+replace+this+with+a+description+of+how+you+were+using+SurfingKeys.%2A%2A".format(encodeURIComponent(description), chrome.runtime.getManifest().version, encodeURIComponent(navigator.userAgent), encodeURIComponent(window.location.href));
    var error = '<h2>Uh-oh! The SurfingKeys extension encountered a bug.</h2> <p>Please click <a href="https://github.com/brookhong/Surfingkeys/issues/new?title={0}&body={1}" target=_blank>here</a> to start filing a new issue, append a description of how you were using SurfingKeys before this message appeared, then submit it.  Thanks for your help!</p>'.format(title, description);

    Front.showPopup(error);
}

function hasScroll(el, direction, barSize) {
    var offset = (direction === 'y') ? ['scrollTop', 'height'] : ['scrollLeft', 'width'];
    var result = el[offset[0]];

    if (result < barSize) {
        // set scroll offset to barSize, and verify if we can get scroll offset as barSize
        var originOffset = el[offset[0]];
        el[offset[0]] = el.getBoundingClientRect()[offset[1]];
        result = el[offset[0]];
        el[offset[0]] = originOffset;
    }
    return result >= barSize && (
        el === document.body
        || $(el).css('overflow-' + direction) === 'auto'
        || $(el).css('overflow-' + direction) === 'scroll');
}

function isElementPartiallyInViewport(el) {
    var rect = el.getBoundingClientRect();
    var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
    var windowWidth = (window.innerWidth || document.documentElement.clientWidth);

    return rect.width > 4 && rect.height > 4
        && (rect.top <= windowHeight) && (rect.bottom >= 0)
        && (rect.left <= windowWidth) && (rect.right >= 0);
}

function getVisibleElements(filter) {
    var all = document.documentElement.getElementsByTagName("*");
    var visibleElements = [];
    for (var i = 0, len = all.length; i < len; i++) {
        var e = all[i];
        var rect = e.getBoundingClientRect();
        if ( (rect.top <= window.innerHeight) && (rect.bottom >= 0)
            && (rect.left <= window.innerWidth) && (rect.right >= 0)
            && rect.height < window.innerHeight && rect.height > 0
        ) {
            filter(e, visibleElements);
        }
    }
    return visibleElements;
}

function filterOverlapElements(elements) {
    // filter out tiny elements
    elements = elements.filter(function(e) {
        var be = e.getBoundingClientRect();
        var el = document.elementFromPoint(be.left + be.width / 2, be.top + be.height / 2);
        if (["input", "textarea", "select"].indexOf(e.localName) !== -1) {
            return true;
        } else {
            return (!el || (el.contains(e) || e.contains(el)) || el.href !== e.href) && !e.disabled && !e.readOnly && be.width > 4;
        }
    });
    // filter out element which has his children covered
    return elements.filter(function(e) {
        return !$(e.children).toArray().some(function(element, index, array) {
            return elements.indexOf(element) !== -1;
        });
    });
}


function getTextNodes(root, pattern, flag) {
    var skip_tags = ['script', 'style', 'noscript', 'surfingkeys_mark'];
    var treeWalker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (!node.data.trim() || !node.parentNode.offsetParent || skip_tags.indexOf(node.parentNode.localName.toLowerCase()) !== -1 || !pattern.test(node.data))
                    return NodeFilter.FILTER_REJECT;
                var br = node.parentNode.getBoundingClientRect();
                if (br.width < 4 || br.height < 4) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }, false);

    var nodes = [];
    if (flag === 1) {
        nodes.push(treeWalker.firstChild());
    } else if (flag === -1) {
        nodes.push(treeWalker.lastChild());
    } else if (flag === 0) {
        return treeWalker;
    } else if (flag === 2) {
        while (treeWalker.nextNode()) nodes.push(treeWalker.currentNode.parentNode);
    } else {
        while (treeWalker.nextNode()) nodes.push(treeWalker.currentNode);
    }
    return nodes;
}

String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{' + i + '\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

RegExp.prototype.toJSON = function() {
    return {source: this.source, flags: this.flags};
};

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
            return $(this).width() * $(this).height() > 0 && $(this).offset().top > (document.scrollingElement || document.body).scrollTop;
        });
    };

    $.fn.filterInvisible = function() {
        return this.filter(function(i) {
            var ret = null;
            var elm = this;
            var style = getComputedStyle(elm);
            if ($(elm).attr('disabled') === undefined && style.visibility !== "hidden") {
                var r = elm.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) {
                    // use the first visible child instead
                    var children = $(elm).find('*').filter(function(j) {
                        var r = this.getBoundingClientRect();
                        return (r.width > 0 && r.height > 0);
                    });
                    if (children.length) {
                        elm = children[0];
                    }
                }
                if (isElementPartiallyInViewport(elm)) {
                    ret = elm;
                }
            }
            return ret !== null;
        });
    };
})(jQuery);

(function() {
    var KeyboardUtils, root;

    KeyboardUtils = {
        keyCodesMac: {
            Minus: ["-", "_"],
            Equal: ["=", "+"],
            BracketLeft: ["[", "{"],
            BracketRight: ["]", "}"],
            Backslash: ["\\", "|"],
            Semicolon: [";", ":"],
            Quote: ["'", "\""],
            Comma: [",", "<"],
            Period: [".", ">"],
            Slash: ["/", "?"]
        },
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
        modifierKeys: {
            16: "Shift",
            17: "Ctrl",
            18: "Alt",
            91: "Meta",
            92: "Meta",
            93: "ContextMenu",
            229: "Process"
        },
        keyNames: {
            8:   'Backspace',
            9:   'Tab',
            12:  'NumLock',
            27:  'Esc',
            32:  'Space',
            46:  'Delete',
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
            var character;
            if (event.keyCode in this.modifierKeys) {
                character = "";
            } else {
                if (this.keyNames.hasOwnProperty(event.keyCode)) {
                    character = "{0}".format(this.keyNames[event.keyCode]);
                } else {
                    character = event.key;
                    if (!character) {
                        if (event.keyIdentifier) {
                            // keep for chrome version below 52
                            if (event.keyIdentifier.slice(0, 2) !== "U+") {
                                character = "{0}".format(event.keyIdentifier);
                            } else {
                                var keyIdentifier = event.keyIdentifier;
                                if ((this.platform === "Windows" || this.platform === "Linux") && this.keyIdentifierCorrectionMap[keyIdentifier]) {
                                    var correctedIdentifiers = this.keyIdentifierCorrectionMap[keyIdentifier];
                                    keyIdentifier = event.shiftKey ? correctedIdentifiers[1] : correctedIdentifiers[0];
                                }
                                var unicodeKeyInHex = "0x" + keyIdentifier.substring(2);
                                character = String.fromCharCode(parseInt(unicodeKeyInHex));
                                character = event.shiftKey ? character : character.toLowerCase();
                            }
                        }
                    } else {
                        if (character.charCodeAt(0) > 127   // Alt-s is ß under Mac
                            || character === "Dead"         // Alt-i is Dead under Mac
                        ) {
                            if (event.keyCode < 127) {
                                character = String.fromCharCode(event.keyCode);
                                character = event.shiftKey ? character : character.toLowerCase();
                            } else if (this.keyCodesMac.hasOwnProperty(event.code)) {
                                // Alt-/ or Alt-?
                                character = this.keyCodesMac[event.code][event.shiftKey ? 1 : 0];
                            }
                        } else if (character === "Unidentified") {
                            // for IME on
                            character = "";
                        }
                    }
                }
                if (event.shiftKey && character.length > 1) {
                    character = "Shift-" + character;
                }
                if (event.metaKey) {
                    character = "Meta-" + character;
                }
                if (event.altKey) {
                    character = "Alt-" + character;
                }
                if (event.ctrlKey) {
                    character = "Ctrl-" + character;
                }
                if (character.length > 1) {
                    character = "<{0}>".format(character);
                }
            }
            if (decodeKeystroke(encodeKeystroke(character)) === character) {
                character = encodeKeystroke(character);
            }
            return character;
        },
        isWordChar: function(event) {
            return (event.keyCode < 123 && event.keyCode >= 97 || event.keyCode < 91 && event.keyCode >= 65 || event.keyCode < 58 && event.keyCode >= 48);
        }
    };

    KeyboardUtils.init();

    root = typeof exports !== "undefined" && exports !== null ? exports : window;

    root.KeyboardUtils = KeyboardUtils;

    root.keyCodes = KeyboardUtils.keyCodes;

}).call(this);

// <Esc>: ✐: <Esc>
// <Alt-Space>: ⤑: <Alt-Space>
// <Ctrl-Alt-F7>: ⨘: <Ctrl-Alt-F7>
// <Ctrl-'>: ⠷: <Ctrl-'>
// <Alt-i>: ⥹: <Alt-i>
// <Ctrl-Alt-z>: ⪊: <Ctrl-Alt-z>
// <Ctrl-Alt-Meta-h>: ⹸: <Ctrl-Alt-Meta-h>
function _encodeKeystroke(s, k) {
    var mod = 0;
    if (s.indexOf("Ctrl-") !== -1) {
        mod |= 1;
    }
    if (s.indexOf("Alt-") !== -1) {
        mod |= 2;
    }
    if (s.indexOf("Meta-") !== -1) {
        mod |= 4;
    }
    if (s.indexOf("Shift-") !== -1) {
        mod |= 8;
    }
    var code;
    if (k.length > 1) {
        code = 256 + encodeKeystroke.specialKeys.indexOf(k);
    } else {
        code = k.charCodeAt(0);
    }

    // <flag: always 1><flag: 1 bit, 0 for visible keys, 1 for invisible keys><key: 8 bits><mod: 4 bits>
    code = 8192 + (code << 4) + mod;
    return String.fromCharCode(code);
}
function encodeKeystroke(s) {
    var ekp = /<(?:Ctrl-)?(?:Alt-)?(?:Meta-)?(?:Shift-)?([^>]+|.)>/g;
    var mtches, ret = "", lastIndex = 0;
    while ((mtches = ekp.exec(s)) !== null) {
        ret += s.substr(lastIndex, mtches.index - lastIndex);
        ret += _encodeKeystroke(mtches[0], mtches[1]);
        lastIndex = ekp.lastIndex;
    }
    ret += s.substr(lastIndex);
    return ret;
}
encodeKeystroke.specialKeys = ['Esc', 'Space', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Enter', 'Tab', 'Delete', 'End', 'Home', 'Insert', 'NumLock', 'PageDown', 'PageUp', 'Pause', 'ScrollLock', 'CapsLock', 'PrintScreen', 'Escape', 'Hyper'];

function decodeKeystroke(s) {
    var ret = "";
    for (var i = 0; i < s.length; i++) {
        var r = s[i].charCodeAt(0);
        if (r > 8192) {
            r = r - 8192;
            var flag = r >> 12,
                key = (r % 4096) >> 4,
                mod = r & 15;
            if (flag) {
                r = encodeKeystroke.specialKeys[key % 256];
            } else {
                r = String.fromCharCode(key);
            }
            if (mod & 8) {
                r = "Shift-" + r;
            }
            if (mod & 4) {
                r = "Meta-" + r;
            }
            if (mod & 2) {
                r = "Alt-" + r;
            }
            if (mod & 1) {
                r = "Ctrl-" + r;
            }
            ret += "<" + r + ">";
        } else {
            ret += s[i];
        }
    }
    return ret;
}
/*
 * test code
 *

function _testEncode(keystr) {
    var encoded = encodeKeystroke(keystr);
    var decoded = decodeKeystroke(encoded);
    if (keystr !== decoded) {
        console.log(keystr + ": " + encoded + ": " + decoded);
    }
}

for ( var i = 0; i < encodeKeystroke.specialKeys.length; i++) {
    var c = encodeKeystroke.specialKeys[i];
    ["", "Ctrl-", "Alt-", "Shift-", "Meta-", "Ctrl-Alt-", "Ctrl-Shift-", "Ctrl-Meta-", "Alt-Shift-", "Alt-Meta-", "Alt-Meta-Shift-", "Meta-Shift-", "Ctrl-Alt-Shift-", "Ctrl-Alt-Meta-", "Ctrl-Meta-Shift-", "Ctrl-Alt-Meta-Shift-"].forEach(function(u) {
        _testEncode("<" + u + c + ">");
    });
}
for ( var i = 32; i < 256; i++) {
    var c = String.fromCharCode(i);
    ["Ctrl-", "Alt-", "Meta-", "Ctrl-Alt-", "Ctrl-Meta-", "Alt-Meta-", "Ctrl-Alt-Meta-"].forEach(function(u) {
        _testEncode("<" + u + c + ">");
    });
}
var testStrokes = ["<Ctrl-Alt-Meta-m>0<Ctrl-Meta-i>", "ab<Ctrl-Meta-i>", "<Ctrl-Alt-Meta-m>334?", "<Ctrl->>?ee<Alt->>"];
for ( var i = 0; i < testStrokes.length; i++) {
    _testEncode(testStrokes[i]);
}
*/
