const KeyboardUtils = {
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
};

KeyboardUtils.platform = "Windows";
if (typeof(navigator) !== 'undefined') {
    if (navigator.platform.indexOf("Mac") !== -1) {
        KeyboardUtils.platform = "Mac";
    } else if (navigator.userAgent.indexOf("Linux") !== -1) {
        KeyboardUtils.platform = "Linux";
    }
}

KeyboardUtils.getKeyChar = function(event) {
    var character;
    if (event.keyCode in this.modifierKeys) {
        character = "";
    } else {
        if (this.keyNames.hasOwnProperty(event.keyCode)) {
            character = "{0}".format(this.keyNames[event.keyCode]);
        } else {
            character = event.key || "";
            if (["Shift", "Meta", "Alt", "Ctrl"].indexOf(character) !== -1) {
                character = "";
            }
            if (!character) {
                if (event.keyIdentifier) {
                    // keep for chrome version below 52
                    if (event.keyIdentifier.slice(0, 2) !== "U+") {
                        character = "{0}".format(event.keyIdentifier);
                    } else {
                        var keyIdentifier = event.keyIdentifier;
                        if ((KeyboardUtils.platform === "Windows" || KeyboardUtils.platform === "Linux") && this.keyIdentifierCorrectionMap[keyIdentifier]) {
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
        if (character.length > 0) {
            if (event.metaKey) {
                character = "Meta-" + character;
            }
            if (event.altKey) {
                character = "Alt-" + character;
            }
            if (event.ctrlKey) {
                character = "Ctrl-" + character;
            }
        }
        if (character.length > 1) {
            character = "<{0}>".format(character);
        }
    }
    if (KeyboardUtils.decodeKeystroke(KeyboardUtils.encodeKeystroke(character)) === character) {
        character = KeyboardUtils.encodeKeystroke(character);
    }
    return character;
};

KeyboardUtils.isWordChar = function(event) {
    return (event.keyCode < 123 && event.keyCode >= 97 || event.keyCode < 91 && event.keyCode >= 65 || event.keyCode < 58 && event.keyCode >= 48);
};

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
        code = 256 + KeyboardUtils.specialKeys.indexOf(k);
    } else {
        code = k.charCodeAt(0);
    }

    // <flag: always 1><flag: 1 bit, 0 for visible keys, 1 for invisible keys><key: 8 bits><mod: 4 bits>
    code = 8192 + (code << 4) + mod;
    return String.fromCharCode(code);
}
KeyboardUtils.encodeKeystroke = function (s) {
    var ekp = /<(?:Ctrl-)?(?:Alt-)?(?:Meta-)?(?:Shift-)?([^>]+|.)>/g;
    var mtches, ret = "", lastIndex = 0;
    while ((mtches = ekp.exec(s)) !== null) {
        ret += s.substr(lastIndex, mtches.index - lastIndex);
        ret += _encodeKeystroke(mtches[0], mtches[1]);
        lastIndex = ekp.lastIndex;
    }
    ret += s.substr(lastIndex);
    return ret;
};

KeyboardUtils.specialKeys = ['Esc', 'Space', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Enter', 'Tab', 'Delete', 'End', 'Home', 'Insert', 'NumLock', 'PageDown', 'PageUp', 'Pause', 'ScrollLock', 'CapsLock', 'PrintScreen', 'Escape', 'Hyper'];

KeyboardUtils.decodeKeystroke = function (s) {
    var ret = "";
    for (var i = 0; i < s.length; i++) {
        var r = s[i].charCodeAt(0);
        if (r > 8192) {
            r = r - 8192;
            var flag = r >> 12,
                key = (r % 4096) >> 4,
                mod = r & 15;
            if (flag) {
                r = KeyboardUtils.specialKeys[key % 256];
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
};

export default KeyboardUtils;


/*
 * test code
 *

// <Esc>: ✐: <Esc>
// <Alt-Space>: ⤑: <Alt-Space>
// <Ctrl-Alt-F7>: ⨘: <Ctrl-Alt-F7>
// <Ctrl-'>: ⠷: <Ctrl-'>
// <Alt-i>: ⥹: <Alt-i>
// <Ctrl-Alt-z>: ⪊: <Ctrl-Alt-z>
// <Ctrl-Alt-Meta-h>: ⹸: <Ctrl-Alt-Meta-h>

function _testEncode(keystr) {
    var encoded = KeyboardUtils.encodeKeystroke(keystr);
    var decoded = KeyboardUtils.decodeKeystroke(encoded);
    if (keystr !== decoded) {
        console.log(keystr + ": " + encoded + ": " + decoded);
    }
}

for ( var i = 0; i < KeyboardUtils.specialKeys.length; i++) {
    var c = KeyboardUtils.specialKeys[i];
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
