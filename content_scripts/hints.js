function createHints() {
    var self = new Mode("Hints");

    self.addEventListener('keydown', function(event) {
        var hints = holder.querySelectorAll('#sk_hints>div');
        event.sk_stopPropagation = true;

        var ai = document.querySelector('#sk_hints[mode=input]>div.activeInput');
        if (ai !== null) {
            var elm = ai.link;
            if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
                elm.blur();
                hide();
            } else if (event.keyCode === KeyboardUtils.keyCodes.tab) {
                ai.classList.remove('activeInput');
                _lastCreateAttrs.activeInput = (_lastCreateAttrs.activeInput + (event.shiftKey ? -1 : 1 )) % hints.length;
                ai = hints[_lastCreateAttrs.activeInput];
                ai.classList.add('activeInput');

                elm = ai.link;
                elm.focus();
            } else if (event.keyCode !== KeyboardUtils.keyCodes.shiftKey) {
                event.sk_stopPropagation = false;
                hide();
                Insert.enter(elm);
            }
            return;
        }

        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            hide();
        } else if (event.keyCode === KeyboardUtils.keyCodes.space) {
            holder.style.display = "none";
        } else if (event.keyCode === KeyboardUtils.keyCodes.shiftKey) {
            flip();
        } else if (hints.length > 0) {
            if (event.keyCode === KeyboardUtils.keyCodes.backspace) {
                if (prefix.length > 0) {
                    prefix = prefix.substr(0, prefix.length - 1);
                    handleHint(event);
                } else if (textFilter.length > 0) {
                    textFilter = textFilter.substr(0, textFilter.length - 1);
                    refreshByTextFilter();
                }
            } else {
                var key = event.sk_keyName;
                if (isCapital(key)) {
                    shiftKey = true;
                }
                if (key !== '') {
                    if (self.numericHints) {
                        if (key >= "0" && key <= "9") {
                            prefix += key;
                        } else {
                            textFilter += key;
                            refreshByTextFilter();
                        }
                        handleHint(event);
                    } else if (self.characters.toLowerCase().indexOf(key.toLowerCase()) !== -1) {
                        prefix = prefix + key.toUpperCase();
                        handleHint(event);
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
            holder.style.display = "";
        }
    });

    var prefix = "",
        textFilter = "",
        lastMouseTarget = null,
        behaviours = {
            mouseEvents: ['mouseover', 'mousedown', 'mouseup', 'click']
        },
        holder = createElement('<div id="sk_hints" style="display: block; opacity: 1;"/>'),
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
        } while (node && node !== document.body && node !== document && node.nodeType !== node.DOCUMENT_FRAGMENT_NODE);
        return z;
    }

    function handleHint(evt) {
        var matches = refresh();
        if (matches.length === 1) {
            Normal.appendKeysForRepeat("Hints", prefix);
            var link = matches[0].link;
            _onHintKey(link);
            if (behaviours.multipleHits) {
                prefix = "";
                refresh();
            } else {
                hide();
            }
            if (evt) {
                Mode.suppressKeyUp(evt.keyCode);
                evt.stopImmediatePropagation();
                evt.preventDefault();
            }
        } else if (matches.length === 0) {
            hide();
        }
    }

    function refreshByTextFilter() {
        var hints = holder.querySelectorAll('#sk_hints>div');
        hints = Array.from(hints);
        if (textFilter.length > 0) {
            hints = hints.filter(function(hint) {
                hint.label = "";
                setInnerHTML(hint, "");
                var e = hint.link;
                var text = e.innerText;
                if (text === undefined) {
                    text = e[0] ? e[0].textContent : "";
                }
                return text.indexOf(textFilter) !== -1;
            });
        }
        var hintLabels = self.genLabels(hints.length);
        hints.forEach(function(e, i) {
            e.label = hintLabels[i];
            setInnerHTML(e, hintLabels[i]);
        });
    }

    function refresh() {
        var matches = [];
        var hints = holder.querySelectorAll('#sk_hints>div:not(:empty)');
        hints.forEach(function(hint) {
            var label = hint.label;
            if (prefix.length === 0) {
                hint.style.opacity = 1;
                setInnerHTML(hint, label);
                matches.push(hint);
            } else if (label.indexOf(prefix) === 0) {
                hint.style.opacity = 1;
                setInnerHTML(hint, `<span style="opacity: 0.2;">${prefix}</span>` + label.substr(prefix.length));
                matches.push(hint);
            } else {
                hint.style.opacity = 0;
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
        setInnerHTML(holder, "");
        holder.remove();
        prefix = "";
        textFilter = "";
        shiftKey = false;
        self.exit();
    }

    function flip() {
        var hints = holder.querySelectorAll('#sk_hints>div');
        if (hints[0].style.zIndex == hints[0].zIndex) {
            hints.forEach(function(hint, i) {
                var z = parseInt(hint.style.zIndex);
                hint.style.zIndex = hints.length - i + 2147483000 - z;
            });
        } else {
            hints.forEach(function(hint, i) {
                hint.style.zIndex = hint.zIndex;
            });
        }
    }

    function onScrollStarted(evt) {
        setInnerHTML(holder, "");
        holder.remove();
        prefix = "";
    }

    function resetHints(evt) {
        var start = new Date().getTime();
        var found = createHints(_cssSelector, _lastCreateAttrs);
        if (found > 1) {
            self.statusLine += " - " + (new Date().getTime() - start) + "ms / " + found;
            Mode.showStatus();
        }
    }

    self.onEnter = function() {
        document.addEventListener("surfingkeys:scrollStarted", onScrollStarted);
        document.addEventListener("surfingkeys:scrollDone", resetHints);
    };

    self.onExit = function() {
        document.removeEventListener("surfingkeys:scrollStarted", onScrollStarted);
        document.removeEventListener("surfingkeys:scrollDone", resetHints);
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
        var link = createElement('<div style="top: 0; left: 0;">A</div>');
        holder.prepend(link);
        document.documentElement.prepend(holder);
        var br = link.getBoundingClientRect();
        setInnerHTML(holder, "");
        return {
            top: br.top + window.pageYOffset - document.documentElement.clientTop,
            left: br.left + window.pageXOffset - document.documentElement.clientLeft
        };
    };

    function _initHolder(mode) {
        setInnerHTML(holder, "");
        holder.setAttribute('mode', mode);
        holder.style.display = "";
    }

    function placeHints(elements) {
        _initHolder('click');
        var hintLabels = self.genLabels(elements.length);
        var bof = self.coordinate();
        var style = createElement(`<style>#sk_hints>div.myHint{${_styleForClick}}</style>`);
        holder.prepend(style);
        var links = elements.map(function(elm, i) {
            var r = getRealRect(elm),
                z = getZIndex(elm);
            var left, width = Math.min(r.width, window.innerWidth);
            if (runtime.conf.hintAlign === "right") {
                left = window.pageXOffset + r.left - bof.left + width;
            } else if (runtime.conf.hintAlign === "left") {
                left = window.pageXOffset + r.left - bof.left;
            } else {
                left = window.pageXOffset + r.left - bof.left + width / 2;
            }
            if (left < window.pageXOffset) {
                left = window.pageXOffset;
            } else if (left + 32 > window.pageXOffset + window.innerWidth) {
                left = window.pageXOffset + window.innerWidth - 32;
            }
            var link = createElement(`<div class="myHint">${hintLabels[i]}</div>`);
            if (elm.dataset.hint_scrollable) { link.classList.add('hint-scrollable'); }
            link.style.top = Math.max(r.top + window.pageYOffset - bof.top, 0) + "px";
            link.style.left = left + "px";
            link.style.zIndex = z + 9999;
            link.zIndex = link.style.zIndex;
            link.label = hintLabels[i];
            link.link = elm;
            return link;
        });
        links.forEach(function(link) {
            holder.appendChild(link);
        });
        var hints = holder.querySelectorAll('#sk_hints>div');
        var bcr = getRealRect(hints[0]);
        for (var i = 1; i < hints.length; i++) {
            var h = hints[i];
            var tcr = getRealRect(h);
            if (tcr.top === bcr.top && Math.abs(tcr.left - bcr.left) < bcr.width) {
                h.style.top = h.offsetTop + h.offsetHeight + "px";
            }
            bcr = getRealRect(h);
        }
        document.documentElement.prepend(holder);
    }

    function createHintsForElements(elements, attrs) {
        attrs = Object.assign({
            active: true,
            tabbed: false,
            mouseEvents: ['mouseover', 'mousedown', 'mouseup', 'click'],
            multipleHits: false,
            filterInvisible: true
        }, attrs || {});
        for (var attr in attrs) {
            behaviours[attr] = attrs[attr];
        }
        self.statusLine = (attrs && attrs.statusLine) || "Hints to click";

        if (attrs.filterInvisible) {
            elements = filterInvisibleElements(elements);
        }
        if (elements.length > 0) {
            placeHints(elements);
        }
        return elements.length;
    }

    function createHintsForClick(cssSelector, attrs) {
        self.statusLine = "Hints to click";

        attrs = Object.assign({
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
            elements = Array.from(getElements('a[href]:not([href^=javascript])'));
            elements = filterInvisibleElements(elements);
        } else {
            if (cssSelector === "") {
                elements = getVisibleElements(function(e, v) {
                    if (isElementClickable(e)) {
                        v.push(e);
                    }
                });
                elements = filterOverlapElements(elements);
            } else if (Array.isArray(cssSelector)) {
                elements = filterInvisibleElements(cssSelector);
            } else {
                elements = Array.from(document.documentElement.querySelectorAll(cssSelector));
                elements = filterInvisibleElements(elements);
                elements = filterOverlapElements(elements);
            }
        }

        if (elements.length > 0) {
            placeHints(elements);
        }

        return elements.length;
    }

    function createHintsForTextNode(rxp, attrs) {
        for (var attr in attrs) {
            behaviours[attr] = attrs[attr];
        }
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
        elements = elements.flatMap(function (e) {
            var aa = e.childNodes;
            var bb = [];
            for (var i = 0, len = aa.length; i < len; i++) {
                if (aa[i].nodeType == Node.TEXT_NODE && aa[i].data.trim().length > 1) {
                    bb.push(aa[i]);
                }
            }
            return bb;
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
            var caretViewport = [0, 0, window.innerHeight, window.innerWidth];
            if (runtime.conf.caretViewport && runtime.conf.caretViewport.length === 4) {
                caretViewport = runtime.conf.caretViewport;
            }
            if (e[0].data.trim().length === 0
                || pos.top < caretViewport[0]
                || pos.left < caretViewport[1]
                || pos.top > caretViewport[2]
                || pos.left > caretViewport[3]) {
                return null;
            } else {
                var z = getZIndex(e[0].parentNode);
                var link = createElement('<div/>');
                if (e[1] === 0) {
                    link.className = "begin";
                }
                link.style.position = "fixed";
                link.style.top = pos.top + "px";
                link.style.left = pos.left + "px";
                link.style.zIndex = z + 9999;
                link.zIndex = link.style.zIndex;
                link.link = e;
                return link;
            }
        }).filter(function(e) {
            return e !== null;
        });
        if (document.getSelection().anchorNode) {
            document.getSelection().collapseToStart();
        }

        if (elements.length > 0) {
            _initHolder('text');
            var hintLabels = self.genLabels(elements.length);
            elements.forEach(function(e, i) {
                e.label = hintLabels[i];
                setInnerHTML(e, hintLabels[i]);
                holder.append(e);
            });

            var style = createElement(`<style>#sk_hints[mode='text']>div{${_styleForText}}</style>`);
            holder.prepend(style);
            document.documentElement.prepend(holder);
        }

        return elements.length;
    }

    function createHints(cssSelector, attrs) {
        if (cssSelector.constructor.name === "RegExp") {
            return createHintsForTextNode(cssSelector, attrs);
        } else if (Array.isArray(cssSelector)) {
            return createHintsForElements(cssSelector, attrs);
        }
        return createHintsForClick(cssSelector, attrs);
    }

    self.createInputLayer = function() {
        var cssSelector = "input";

        var elements = getVisibleElements(function(e, v) {
            if (e.matches(cssSelector) && !e.disabled && !e.readOnly
                && (e.type === "text" || e.type === "password")) {
                v.push(e);
            }
        });

        if (elements.length === 0 && document.querySelector(cssSelector) !== null) {
            document.querySelector(cssSelector).scrollIntoView();
            elements = getVisibleElements(function(e, v) {
                if (e.matches(cssSelector) && !e.disabled && !e.readOnly) {
                    v.push(e);
                }
            });
        }

        if (elements.length > 1) {
            self.enter();
            _initHolder('input');
            elements.forEach(function(e, i) {
                var be = e.getBoundingClientRect();
                var z = getZIndex(e);

                var mask = createElement('<div/>');
                mask.style.position = "fixed";
                mask.style.top = be.top + "px";
                mask.style.left = be.left + "px";
                mask.style.width = be.width + "px";
                mask.style.height = be.height + "px";
                mask.style.zIndex = z + 9999;
                mask.link = e;
                // prevent style from #sk_hints>div:empty
                mask.innerText = " ";
                holder.append(mask);
            });
            document.documentElement.prepend(holder);
            _lastCreateAttrs.activeInput = 0;
            var ai = document.querySelector('#sk_hints[mode=input]>div');
            ai.classList.add("activeInput");
            Normal.passFocus(true);
            ai.link.focus();
        } else if (elements.length === 1) {
            Normal.passFocus(true);
            elements[0].focus();
            Insert.enter(elements[0]);
        }
    };

    self.getSelector = function() {
        return _cssSelector;
    };

    self.create = function(cssSelector, onHintKey, attrs) {
        if (self.numericHints) {
            self.characters = "1234567890";
        }

        // save last used attributes, which will be reused if the user scrolls while the hints are still open
        _cssSelector = cssSelector;
        _onHintKey = onHintKey;
        _lastCreateAttrs = attrs || {};

        var start = new Date().getTime();
        var found = createHints(cssSelector, attrs);
        if (found > 1) {
            self.statusLine += " - " + (new Date().getTime() - start) + "ms / " + found;
            self.enter();
        } else {
            handleHint();
        }
    };

    self.flashPressedLink = function(link) {
        var rect = getRealRect(link);
        var flashElem = createElement('<div style="position: fixed; box-shadow: 0px 0px 4px 2px #63b2ff; background: transparent; z-index: 2140000000"/>');
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
            Normal.passFocus(true);
            element.focus();
            Insert.enter(element);
        } else {
            if (!behaviours.multipleHits) {
                self.exit();
            }
            var tabbed = behaviours.tabbed, active = behaviours.active;
            if (behaviours.multipleHits && element.href) {
                tabbed = true;
                active = false;
            }

            if (shiftKey && window.navigator.userAgent.indexOf("Firefox") !== -1) {
                // mouseButton does not work for firefox in mouse event.
                tabbed = true;
                active = true;
            }

            if (tabbed) {
                RUNTIME("openLink", {
                    tab: {
                        tabbed: tabbed,
                        active: active
                    },
                    url: element.href
                });
            } else {
                self.mouseoutLastElement();
                dispatchMouseEvent(element, behaviours.mouseEvents, shiftKey);
                Normal.turnOnDOMObserver();
                lastMouseTarget = element;
            }
        }
    };
    self.mouseoutLastElement = function() {
        if (lastMouseTarget) {
            dispatchMouseEvent(lastMouseTarget, ['mouseout'], false);
            lastMouseTarget = null;
        }
    };

    var _styleForText = "", _styleForClick = "";
    self.style = function(css, mode) {
        if (mode === "text") {
            _styleForText = css;
        } else {
            _styleForClick = css;
        }
    };

    self.feedkeys = function(keys) {
        setTimeout(function() {
            prefix = keys.toUpperCase();
            handleHint();
        }, 1);
    };

    return self;
}
