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
function isEditable(element) {
    return element.localName === 'textarea'
        || element.localName === 'select'
        || element.isContentEditable
        || (element.localName === 'input' && /^(?!button|checkbox|file|hidden|image|radio|reset|submit)/i.test(element.type));
}
function reportIssue(title, description) {
    title = encodeURIComponent(title);
    description = "%23%23+Error+details%0A%0A{0}%0A%0ASurfingKeys%3A+{1}%0A%0AChrome%3A+{2}%0A%0A%23%23+Context%0A%0A%2A%2APlease+replace+this+with+a+description+of+how+you+were+using+SurfingKeys.%2A%2A".format(encodeURIComponent(description), chrome.runtime.getManifest().version, encodeURIComponent(navigator.userAgent));
    var error = '<h2>Uh-oh! The SurfingKeys extension encountered a bug.</h2> <p>Please click <a href="https://github.com/brookhong/Surfingkeys/issues/new?title={0}&body={1}" target=_blank>here</a> to start filing a new issue, append a description of how you were using SurfingKeys before this message appeared, then submit it.  Thanks for your help!</p>'.format(title, description);

    Front.showPopup(error);
}

String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{' + i + '\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
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
            return $(this).width() * $(this).height() > 0 && $(this).offset().top > document.body.scrollTop;
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
            91: "Meta"
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
            if (decodeKeystroke(encodeKeystroke(character)) !== character) {
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
                reportIssue("Unrecognized key event: {0}".format(character), keyStr);
            }
            return encodeKeystroke(character);
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
function encodeKeystroke(s) {
    var code = s, groups = s.match(/<(?:Ctrl-)?(?:Alt-)?(?:Meta-)?(?:Shift-)?(.+)>/);
    if (groups) {
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
        if (groups[1].length > 1) {
            code = encodeKeystroke.specialKeys.indexOf(groups[1]);
        } else {
            code = groups[1].charCodeAt(0);
        }

        code = ((mod<<8) + 10000) + code;
        code = String.fromCharCode(code);
    }
    return code;
}
encodeKeystroke.specialKeys = ['Esc', 'Space', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Enter', 'Tab', 'Delete', 'End', 'Home', 'Insert', 'NumLock', 'PageDown', 'PageUp', 'Pause', 'ScrollLock', 'CapsLock', 'PrintScreen', 'Escape'];

function decodeKeystroke(s) {
    var r = s.charCodeAt(0);
    if (r >= 10000) {
        r = r - 10000;
        var c;
        if (r % 256 < encodeKeystroke.specialKeys.length) {
            c = encodeKeystroke.specialKeys[r % 256];
        } else {
            c = String.fromCharCode(r % 256);
        }
        r = r >> 8;
        if (r & 8) {
            c = "Shift-" + c;
        }
        if (r & 4) {
            c = "Meta-" + c;
        }
        if (r & 2) {
            c = "Alt-" + c;
        }
        if (r & 1) {
            c = "Ctrl-" + c;
        }
        r = "<" + c + ">";
    } else {
        r = s;
    }
    return r;
}

/*
 * test code
 *

for ( var i = 0; i < encodeKeystroke.specialKeys.length; i++) {
    var c = encodeKeystroke.specialKeys[i];
    ["", "Ctrl-", "Alt-", "Shift-", "Meta-", "Ctrl-Alt-", "Ctrl-Shift-", "Ctrl-Meta-", "Alt-Shift-", "Alt-Meta-", "Alt-Meta-Shift-", "Meta-Shift-", "Ctrl-Alt-Shift-", "Ctrl-Alt-Meta-", "Ctrl-Meta-Shift-", "Ctrl-Alt-Meta-Shift-"].forEach(function(u) {
        var keystr = "<" + u + c + ">";
        var encoded = encodeKeystroke(keystr);
        var decoded = decodeKeystroke(encoded);
        if (keystr !== decoded) {
            console.log(keystr + ": " + encoded + ": " + decoded);
        }
    });
}
for ( var i = 32; i < 256; i++) {
    var c = String.fromCharCode(i);
    ["Ctrl-", "Alt-", "Meta-", "Ctrl-Alt-", "Ctrl-Meta-", "Alt-Meta-", "Ctrl-Alt-Meta-"].forEach(function(u) {
        var keystr = "<" + u + c + ">";
        var encoded = encodeKeystroke(keystr);
        var decoded = decodeKeystroke(encoded);
        if (keystr !== decoded) {
            console.log(keystr + ": " + encoded + ": " + decoded);
        }
    });
}
*/
