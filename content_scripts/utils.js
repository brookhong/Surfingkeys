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
            18: "Alt"
        },
        keyNames: {
            8:   'Backspace',
            9:   'Tab',
            12:  'NumLock',
            27:  'Esc',
            32:  'Space',
            46:  'Delete',
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
            return character;
        },
        isWordChar: function(event) {
            return (event.keyCode < 123 && event.keyCode >= 97 || event.keyCode < 91 && event.keyCode >= 65 || event.keyCode < 58 && event.keyCode >= 48);
        }
    };


    root = typeof exports !== "undefined" && exports !== null ? exports : window;

    root.KeyboardUtils = KeyboardUtils;

    root.keyCodes = KeyboardUtils.keyCodes;

}).call(this);
