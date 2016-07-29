var Hints = (function(mode) {
    var self = $.extend({name: "Hints", eventListeners: {}}, mode);

    self.addEventListener('keydown', function(event) {
        var updated = false;
        var hints = holder.find('>div');
        if (event.sk_keyName === Mode.specialKeys["<Esc>"]) {
            hide();
        } else if (hints.length > 0) {
            if (event.keyCode === KeyboardUtils.keyCodes.backspace) {
                prefix = prefix.substr(0, prefix.length - 1);
                updated = true;
            } else {
                var key = String.fromCharCode(event.keyCode);
                if (key !== '' && self.characters.indexOf(key.toLowerCase()) !== -1) {
                    prefix = prefix + key;
                    updated = true;
                }
            }
            handleHint();
        }
        return "stopEventPropagation";
    });

    var prefix = "",
        lastMouseTarget = null,
        behaviours = {},
        style = $("<style></style>"),
        holder = $('<div id=sk_hints/>');
    self.characters = 'asdfgqwertzxcvb';

    function getZIndex(node) {
        var z = 0;
        do {
            var i = parseInt(getComputedStyle(node).getPropertyValue('z-index'));
            z += (isNaN(i) || i < 0) ? 0 : i;
            node = node.parentNode;
        } while (node && node !== document.body && node !== document);
        return z;
    }

    function handleHint() {
        var matches = refresh();
        if (matches.length === 1) {
            Normal.appendKeysForRepeat("Hints", prefix);
            var onhint = $(matches[0]).data('onhint');
            var link = $(matches[0]).data('link');
            if (onhint) {
                onhint.call(window, link, event);
                if (behaviours.multipleHits) {
                    prefix = "";
                    refresh();
                } else {
                    hide();
                }
            } else {
                self.dispatchMouseClick(link, event);
            }
        } else if (matches.length === 0) {
            hide();
        }
    }

    function dispatchMouseEvent(element, events) {
        events.forEach(function(eventName) {
            var event = document.createEvent('MouseEvents');
            event.initMouseEvent(eventName, true, true, window, 1, 0, 0, 0, 0, false,
                false, false, false, 0, null);
            element.dispatchEvent(event);
        });
        lastMouseTarget = element;
    }

    function refresh() {
        var matches = [];
        var hints = holder.find('>div');
        hints.each(function(i) {
            var label = $(this).data('label');
            if (label.indexOf(prefix) === 0) {
                $(this).html(label.substr(prefix.length)).css('opacity', 1);
                $('<span/>').css('opacity', 0.2).html(prefix).prependTo(this);
                matches.push(this);
            } else {
                $(this).css('opacity', 0);
            }
        });
        return matches;
    }

    function hide() {
        // reset default behaviours
        behaviours = {
            active: true,
            tabbed: false,
            multipleHits: false
        };
        holder.html("").remove();
        prefix = "";
        self.exit();
    }

    self.genLabels = function(M) {
        if (M <= self.characters.length) {
            return self.characters.slice(0, M).toUpperCase().split('');
        }
        var codes = [];
        var genCodeWord = function(N, length) {
            for (var i = 0, word = ''; i < length; i++) {
                word += self.characters.charAt(N % self.characters.length).toUpperCase();
                N = ~~(N / self.characters.length);
            }
            codes.push(word.split('').reverse().join(''));
        };

        var b = Math.ceil(Math.log(M) / Math.log(self.characters.length));
        var cutoff = Math.pow(self.characters.length, b) - M;
        var cutoffR = ~~(cutoff / (self.characters.length - 1));

        for (var i = 0; i < cutoffR; i++) {
            genCodeWord(i, b - 1);
        }
        for (var j = cutoffR; j < M; j++) {
            genCodeWord(j + cutoff, b);
        }
        return codes;
    };

    self.coordinate = function() {
        // a hack to get co-ordinate
        var link = $('<div/>').css('top', 0).css('left', 0).html('A').appendTo(holder);
        holder.appendTo('body');
        var ordinate = link.offset();
        holder.html('');
        return ordinate;
    };

    self.create = function(cssSelector, onHintKey, attrs) {
        attrs = $.extend({
            active: true,
            tabbed: false,
            multipleHits: false
        }, attrs || {});
        for (var attr in attrs) {
            behaviours[attr] = attrs[attr];
        }
        holder.html('');
        style.appendTo(holder);
        var elements = $(document.body).find(cssSelector).map(function(i) {
            var ret = null;
            var elm = this;
            if ($(elm).is(":enabled")) {
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
                if (!!r && r.bottom >= 0 && r.right >= 0 && r.top <= document.documentElement.clientHeight && r.left <= document.documentElement.clientWidth && size) {
                    ret = elm;
                }
            }
            return ret;
        });
        elements = elements.filter(function(i) {
            return this !== null;
        });
        if (elements.length > 0) {
            var hintLabels = self.genLabels(elements.length);
            var bof = self.coordinate();
            elements.each(function(i) {
                var pos = $(this).offset(),
                    z = getZIndex(this);
                var link = $('<div/>').css('top', pos.top - bof.top).css('left', pos.left - bof.left + $(this).width() / 2)
                    .css('z-index', z + 2)
                    .data('label', hintLabels[i])
                    .data('link', this)
                    .data('onhint', onHintKey)
                    .html(hintLabels[i]);
                holder.append(link);
            });
            var hints = holder.find('>div');
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
            holder.appendTo('body');
            self.enter();
        }
        if (elements.length === 1) {
            handleHint();
        }
    };

    self.dispatchMouseClick = function(element, event) {
        if (isEditable(element)) {
            element.focus();
            self.exit();
            Insert.enter();
        } else {
            if (!behaviours.multipleHits) {
                self.exit();
            }
            if (behaviours.tabbed || behaviours.active === false) {
                RUNTIME("openLink", {
                    tab: {
                        tabbed: behaviours.tabbed,
                        active: behaviours.active
                    },
                    url: element.href
                });
            } else {
                var realTargets = $(element).find('a:visible');
                realTargets = (realTargets.length) ? realTargets : $(element).find('select:visible, input:visible, textarea:visible');
                element = realTargets.length ? realTargets[0] : element;
                self.mouseoutLastElement();
                dispatchMouseEvent(element, ['mouseover', 'mousedown', 'mouseup', 'click']);
            }
        }
    };
    self.mouseoutLastElement = function() {
        if (lastMouseTarget) {
            dispatchMouseEvent(lastMouseTarget, ['mouseout']);
            lastMouseTarget = null;
        }
    };

    self.style = function(css) {
        style.html("#sk_hints>div{" + css + "}");
    };

    self.feedkeys = function(keys) {
        setTimeout(function() {
            prefix = keys.toUpperCase();
            handleHint();
        }, 1);
    };


    return self;
})(Mode);
