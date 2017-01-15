var Hints = (function(mode) {
    var self = $.extend({name: "Hints", eventListeners: {}}, mode);

    self.addEventListener('keydown', function(event) {
        var hints = holder.find('>div');
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            hide();
        } else if (event.keyCode === KeyboardUtils.keyCodes.space) {
            holder.hide();
        } else if (event.keyCode === KeyboardUtils.keyCodes.shiftKey) {
            flip();
        } else if (hints.length > 0) {
            if (event.keyCode === KeyboardUtils.keyCodes.backspace) {
                prefix = prefix.substr(0, prefix.length - 1);
            } else {
                var key = String.fromCharCode(event.keyCode);
                var casedKey = event.shiftKey ? key : key.toLowerCase();
                
                if (isMappedTo(casedKey, "j")) {
                    Normal.scroll('down');
                    self.create("", Hints.dispatchMouseClick, {tabbed: true, active: false, multipleHits: true});
                } else if (isMappedTo(casedKey, "k")) {
                    Normal.scroll('up');
                    self.create("", Hints.dispatchMouseClick, {tabbed: true, active: false, multipleHits: true});
                } else if (key !== '') {
                    if (self.characters.indexOf(key.toLowerCase()) !== -1) {
                        prefix = prefix + key;
                    } else {
                        // quit hints if user presses non-hint key
                        hide();
                    }
                }
            }
            handleHint();
        }
        event.sk_stopPropagation = true;
    });
    self.addEventListener('keyup', function(event) {
        if (event.keyCode === KeyboardUtils.keyCodes.space) {
            holder.show();
        }
    });

    var prefix = "",
        lastMouseTarget = null,
        behaviours = {
            mouseEvents: ['mouseover', 'mousedown', 'mouseup', 'click']
        },
        style = $("<style></style>"),
        holder = $('<div id=sk_hints/>');
    self.characters = 'asdfgqwertzxcvb';

    function isMappedTo(keyPressed, keyToCheck) {
        var mappingKeyPressed = Normal.mappings.find(encodeKeystroke(keyPressed));
        var mappingKeyToCheck = Normal.mappings.find(encodeKeystroke(keyToCheck));

        return mappingKeyPressed 
            && mappingKeyPressed.meta
            && mappingKeyPressed.meta.word === mappingKeyToCheck.meta.word;
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

    function isElementPartiallyInViewport(el) {
        var rect = el.getBoundingClientRect();
        var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
        var windowWidth = (window.innerWidth || document.documentElement.clientWidth);

        return rect.width && rect.height
            && (rect.top <= windowHeight) && ((rect.top + rect.height) >= 0)
            && (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0)
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
        // To reset default behaviours here is necessary, as some hint my be hit without creation, see clickOn in content_scripts.js
        behaviours = {
            active: true,
            tabbed: false,
            mouseEvents: ['mouseover', 'mousedown', 'mouseup', 'click'],
            multipleHits: false
        };
        holder.html("").remove();
        prefix = "";
        self.exit();
    }

    function flip() {
        var hints = holder.find('>div');
        if (hints.css('z-index') == hints.data('z-index')) {
            hints.each(function(i) {
                var z = parseInt($(this).css('z-index'));
                $(this).css('z-index',  hints.length - i + 2147483000 - z);
            });
        } else {
            hints.each(function(i) {
                var z = $(this).data('z-index');
                $(this).css('z-index', z);
            });
        }
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
            mouseEvents: ['mouseover', 'mousedown', 'mouseup', 'click'],
            multipleHits: false
        }, attrs || {});
        for (var attr in attrs) {
            behaviours[attr] = attrs[attr];
        }
        holder.show().html('');
        if (cssSelector === "") {
            cssSelector = "a, button, select, input, textarea";
            if (!runtime.conf.hintsThreshold || $(cssSelector).length < runtime.conf.hintsThreshold) {
                // to avoid bad performance when there are too many clickable elements.
                cssSelector += ", *:css(cursor=pointer), *[onclick]";
            }
        }
        var elements;
        if (behaviours.tabbed) {
            elements = $('a').regex(/^(?:(?!javascript:\/\/).)+.*$/, $.fn.attr, ['href']);
        } else {
            elements = $(document.body).find(cssSelector);
        }
        elements = elements.filter(function(i) {
            var ret = null;
            var elm = this;
            if ($(elm).attr('disabled') === undefined) {
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
        elements = elements.filter(function() {
            // filter out element which has his children covered
            return !$(this.children).toArray().some(function(element, index, array) {
                return elements.toArray().indexOf(element) !== -1;
            });
        });
        if (elements.length > 0) {
            var hintLabels = self.genLabels(elements.length);
            var bof = self.coordinate();
            style.appendTo(holder);
            elements.each(function(i) {
                var pos = $(this).offset(),
                    z = getZIndex(this);
                if (pos.top === 0 && pos.left === 0) {
                    // work around for svg elements, https://github.com/jquery/jquery/issues/3182
                    pos = this.getBoundingClientRect();
                }
                var left;
                if (runtime.conf.hintAlign === "right") {
                    left = pos.left - bof.left + $(this).width();
                } else if (runtime.conf.hintAlign === "left") {
                    left = pos.left - bof.left;
                } else {
                    left = pos.left - bof.left + $(this).width() / 2;
                }
                left = Math.max(left, 0);
                var link = $('<div/>').css('top', Math.max(pos.top - bof.top, 0)).css('left', left)
                    .css('z-index', z + 9999)
                    .data('z-index', z + 9999)
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
                dispatchMouseEvent(element, behaviours.mouseEvents);
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
