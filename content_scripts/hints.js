var Hints = (function(mode) {
    var self = $.extend({name: "Hints", eventListeners: {}}, mode);

    self.addEventListener('keydown', function(event) {
        var hints = holder.find('>div');
        event.sk_stopPropagation = true;
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            hide();
        } else if (event.keyCode === KeyboardUtils.keyCodes.space) {
            holder.hide();
        } else if (event.keyCode === KeyboardUtils.keyCodes.shiftKey) {
            flip();
        } else if (hints.length > 0) {
            if (event.keyCode === KeyboardUtils.keyCodes.backspace) {
                prefix = prefix.substr(0, prefix.length - 1);
                handleHint();
            } else {
                var key = event.sk_keyName;
                if (isCapital(key)) {
                    shiftKey = true;
                }
                if (key !== '') {
                    if (self.characters.toLowerCase().indexOf(key.toLowerCase()) !== -1) {
                        prefix = prefix + key.toUpperCase();
                        handleHint();
                    } else {
                        if (self.scrollKeys.indexOf(key) === -1) {
                            // quit hints if user presses non-hint key and no keys for scrolling
                            hide();
                        } else {
                            // pass on the key to next mode in stack
                            event.sk_stopPropagation = false;
                        }
                    }
                }
            }
        }
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
        holder = $('<div id="sk_hints" style="display: block; opacity: 1;"/>'),
        shiftKey = false;
    self.characters = 'asdfgqwertzxcvb';
    self.scrollKeys = '0jkhlG$';
    var _lastCreateAttrs = {},
        _onHintKey = self.dispatchMouseClick,
        _cssSelector = "";

    function isCapital(key) {
        return key === key.toUpperCase() &&
               key !== key.toLowerCase(); // in case key is a symbol or special character
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
            var link = $(matches[0]).data('link');
            _onHintKey(link);
            if (behaviours.multipleHits) {
                prefix = "";
                refresh();
            } else {
                hide();
            }
        } else if (matches.length === 0) {
            hide();
        }
    }

    function dispatchMouseEvent(element, events) {
        events.forEach(function(eventName) {
            var event = document.createEvent('MouseEvents');
            var mouseButton = (shiftKey === true) ? 1 : 0;
            event.initMouseEvent(eventName, true, true, window, 1, 0, 0, 0, 0, false,
                false, false, false, mouseButton, null);
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
        // To reset default behaviours here is necessary, as some hint my be hit without creation, see clickOn in content_scripts.js
        behaviours = {
            active: true,
            tabbed: false,
            mouseEvents: ['mouseover', 'mousedown', 'mouseup', 'click'],
            multipleHits: false
        };
        holder.html("").remove();
        prefix = "";
        shiftKey = false;
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

    function onScrollStarted(evt) {
        holder.html("").remove();
        prefix = "";
    }

    function onScrollDone(evt) {
        var start = new Date().getTime();
        var found = createHints(_cssSelector, _lastCreateAttrs);
        if (found > 1) {
            self.statusLine += " - " + (new Date().getTime() - start) + "ms / " + found;
            Mode.showStatus();
        }
    }

    var _origOverflow;
    self.enter = function() {
        _origOverflow = document.body.style.overflowX;
        document.body.style.overflowX = "hidden";
        mode.enter.call(self);
        $(document).on('surfingkeys:scrollStarted', onScrollStarted);
        $(document).on('surfingkeys:scrollDone', onScrollDone);
    };

    self.exit = function() {
        document.body.style.overflowX = _origOverflow;
        mode.exit.call(self);
        $(document).off('surfingkeys:scrollStarted', onScrollStarted);
        $(document).off('surfingkeys:scrollDone', onScrollDone);
    };

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
        holder.prependTo('body');
        var ordinate = link.offset();
        holder.html('');
        return ordinate;
    };

    function placeHints(elements) {
        holder.attr('mode', 'click').show().html('');
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
        holder.prependTo('body');
    }

    function createHintsForClick(cssSelector, attrs) {
        self.statusLine = "Hints to click";

        attrs = $.extend({
            active: true,
            tabbed: false,
            mouseEvents: ['mouseover', 'mousedown', 'mouseup', 'click'],
            multipleHits: false
        }, attrs || {});
        for (var attr in attrs) {
            behaviours[attr] = attrs[attr];
        }
        var elements;
        if (behaviours.tabbed) {
            elements = $('a').regex(/^(?:(?!javascript:\/\/).)+.*$/, $.fn.attr, ['href']).filterInvisible();
        } else {
            if (cssSelector === "") {
                cssSelector = "a, button, select, input, textarea, *[onclick]";
                if (runtime.conf.clickableSelector.length) {
                    cssSelector += ", " + runtime.conf.clickableSelector;
                }

                elements = getVisibleElements(function(e, v) {
                    if (jQuery.find.matchesSelector(e, cssSelector)) {
                        v.push(e);
                    } else if (getComputedStyle(e).cursor === "pointer") {
                        v.push(e);
                    } else if (e.closest('a') !== null) {
                        v.push(e);
                    }
                });
            } else {
                elements = $(document.documentElement).find(cssSelector).filterInvisible().toArray();
            }
            elements = $(filterOverlapElements(elements));
        }

        if (elements.length > 0) {
            placeHints(elements);
        }

        return elements.length;
    }

    function getTextNodePos(node, offset) {
        var selection = document.getSelection();
        selection.setBaseAndExtent(node, offset, node, offset+1)
        var br = selection.getRangeAt(0).getBoundingClientRect();
        var pos = {
            left: -1,
            top: -1
        };
        if (br.height > 0 && br.width > 0) {
            pos.left = br.left;
            pos.top = br.top;
        }
        return pos;
    }

    function createHintsForTextNode(rxp, attrs) {

        self.statusLine = (attrs && attrs.statusLine) || "Hints to select text";

        var elements = getVisibleElements(function(e, v) {
            var aa = e.childNodes;
            for (var i = 0, len = aa.length; i < len; i++) {
                if (aa[i].nodeType == Node.TEXT_NODE && aa[i].data.length > 0) {
                    v.push(e);
                    break;
                }
            }
        });
        elements = filterOverlapElements(elements);
        elements = elements.map(function(e) {
            var aa = e.childNodes;
            for (var i = 0, len = aa.length; i < len; i++) {
                if (aa[i].nodeType == Node.TEXT_NODE && aa[i].data.length > 0) {
                    return aa[i];
                }
            }
        });

        var positions;
        if (rxp.flags.indexOf('g') === -1) {
            positions = elements.map(function(e) {
                return [e, 0, ""];
            });
        } else {
            positions = [];
            for (var i = 0, length = elements.length; i < length; i++) {
                var e = elements[i], match;
                while ((match = rxp.exec(e.data)) != null) {
                    positions.push([e, match.index, match[0]]);
                }
            }
        }

        elements = positions.map(function(e) {
            var pos = getTextNodePos(e[0], e[1]);
            if (pos.top < 0 || pos.top > window.innerHeight
                || pos.left < 0 || pos.left > window.innerWidth) {
                return null;
            } else {
                return $('<div/>').css('position', 'fixed').css('top', pos.top).css('left', pos.left)
                    .css('z-index', 9999)
                    .data('z-index', 9999)
                    .data('link', e);
            }
        }).filter(function(e) {
            return e !== null;
        });
        document.getSelection().collapseToStart();

        if (elements.length > 0) {
            holder.attr('mode', 'text').show().html('');
            var hintLabels = self.genLabels(elements.length);
            elements.forEach(function(e, i) {
                e.data('label', hintLabels[i]).html(hintLabels[i]);
                holder.append(e);
            });
            style.appendTo(holder);
            holder.appendTo('body');
        }

        return elements.length;
    }

    function createHints(cssSelector, attrs) {
        return (cssSelector.constructor.name === "RegExp") ? createHintsForTextNode(cssSelector, attrs) : createHintsForClick(cssSelector, attrs);
    }

    self.getSelector = function() {
        return _cssSelector;
    };

    self.create = function(cssSelector, onHintKey, attrs) {
        // save last used attributes, which will be reused if the user scrolls while the hints are still open
        _cssSelector = cssSelector;
        _onHintKey = onHintKey;
        _lastCreateAttrs = attrs;

        var start = new Date().getTime();
        var found = createHints(cssSelector, attrs);
        if (found > 1) {
            self.statusLine += " - " + (new Date().getTime() - start) + "ms / " + found;
            self.enter();
        } else {
            handleHint();
        }
    };

    var flashElem = $('<div style="position: fixed; box-shadow: 0px 0px 4px 2px #63b2ff; background: transparent; z-index: 2140000000"/>')[0];
    self.flashPressedLink = function(link) {
        var rect = link.getBoundingClientRect();
        flashElem.style.left = rect.left + 'px';
        flashElem.style.top = rect.top + 'px';
        flashElem.style.width = rect.width + 'px';
        flashElem.style.height = rect.height + 'px';
        document.body.appendChild(flashElem);

        setTimeout(function () { flashElem.remove(); }, 300);
    };

    self.dispatchMouseClick = function(element, event) {
        self.flashPressedLink(element);
        if (isEditable(element)) {
            self.exit();
            Insert.enter();
            // Enter Insert mode before element focused, so that pushState could be suppressed.
            // #196 http://www.inoreader.com/all_articles
            element.focus();
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
