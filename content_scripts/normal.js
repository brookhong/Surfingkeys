var Mode = (function() {
    var self = {}, mode_stack = [];
    self.specialKeys = {
        "<Alt-s>": ["<Alt-s>"],       // hotkey to toggleBlacklist
        "<Esc>": ["<Esc>"]
    };

    self.isSpecialKeyOf = function(specialKey, keyToCheck) {
        return (-1 !== self.specialKeys[specialKey].indexOf(decodeKeystroke(keyToCheck)));
    };

    self.postHandler = function(event) {
        if (event.sk_stopPropagation) {
            event.stopImmediatePropagation();
            event.preventDefault();
            // keyup event also needs to be suppressed for the key whose keydown has been suppressed.
            this.stopKeyupPropagation = (event.type === "keydown" && this.enableKeyupMerging) ? event.keyCode : 0;
        }
    };

    self.addEventListener = function(evt, handler) {
        var thisMode = this;

        this.eventListeners[evt] = function(event) {
            if (event.type === "keydown" && !event.hasOwnProperty('sk_keyName')) {
                event.sk_keyName = KeyboardUtils.getKeyChar(event);
            }

            if (event.type === "keyup" && thisMode.stopKeyupPropagation === event.keyCode) {
                event.stopImmediatePropagation();
                thisMode.stopKeyupPropagation = 0;
            }

            if (!event.sk_suppressed) {
                handler(event);
                thisMode.postHandler(event);
            }
        };
        if (this.name !== "Disabled" && !Disabled.eventListeners.hasOwnProperty(evt)) {
            // Disabled mode listenes all events that are listened by any other mode,
            // so that it could suppress any event.
            Disabled.eventListeners[evt] = function(event) {
                event.sk_suppressed = true;
            };
        }
        return this;
    };

    function popModes(modes) {
        modes.forEach(function(m) {
            for (var evt in m.eventListeners) {
                window.removeEventListener(evt, m.eventListeners[evt], true);
            }
        });
    }

    function pushModes(modes) {
        modes.forEach(function(m) {
            for (var evt in m.eventListeners) {
                window.addEventListener(evt, m.eventListeners[evt], true);
            }
        });
    }

    self.enter = function(priority, reentrant) {
        // we need clear the modes stack first to make sure eventListeners of this mode added at first.
        popModes(mode_stack);

        var pos = mode_stack.indexOf(this);
        if (!this.priority) {
            this.priority = priority || mode_stack.length;
        }

        if (pos === -1) {
            // push this mode into stack
            mode_stack.unshift(this);
        } else if (pos > 0) {
            if (reentrant) {
                // pop up all the modes over this
                mode_stack = mode_stack.slice(pos);
            } else {
                var modeList = Mode.stack().map(function(u) { return u.name; }).join(',');
                reportIssue("Mode {0} pushed into mode stack again.".format(this.name), "Modes in stack: {0}".format(modeList));
            }
            // stackTrace();
        }

        mode_stack.sort(function(a,b) {
            return (a.priority < b.priority) ? 1 : ((b.priority < a.priority) ? -1 : 0);
        } );
        pushModes(mode_stack);
        // var modes = mode_stack.map(function(m) {
            // return m.name;
        // }).join('->');
        // console.log('enter {0}, {1}'.format(this.name, modes));

        self.showStatus();
    };

    self.showStatus = function() {
        if (document.hasFocus() && mode_stack.length) {
            var cm = mode_stack[0];
            var sl = cm.statusLine;
            if (sl === undefined) {
                sl = runtime.conf.showModeStatus ? cm.name :  "";
            }
            if (sl !== "" && window !== top) {
                if (chrome.extension.getURL('').indexOf(window.location.origin) === 0) {
                    if (!cm.frontendOnly) {
                        sl += "✩";
                    }
                } else {
                    var pathname = window.location.pathname.split('/');
                    if (pathname.length) {
                        sl += " - frame: " + pathname[pathname.length - 1];
                    }
                }
            }
            Front.showStatus(0, sl);
        }
    };

    self.exit = function(peek) {
        var pos = mode_stack.indexOf(this);
        if (pos !== -1) {
            if (peek) {
                // for peek exit, we need push modes above this back to the stack.
                popModes(mode_stack);
                mode_stack.splice(pos, 1);
                pushModes(mode_stack);
            } else {
                // otherwise, we just pop all modes above this inclusively.
                pos++;
                var popup = mode_stack.slice(0, pos);
                popModes(popup);
                mode_stack = mode_stack.slice(pos);
            }

            // var modes = mode_stack.map(function(m) {
                // return m.name;
            // }).join('->');
            // console.log('exit {0}, {1}'.format(this.name, modes));
        }
        self.showStatus();
    };

    self.stack = function() {
        return mode_stack;
    };

    return self;
})();

var Disabled = (function(mode) {
    var self = $.extend({name: "Disabled", eventListeners: {}}, mode);

    // Disabled has higher priority than others.
    self.priority = 99;

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
        if (Mode.isSpecialKeyOf("<Alt-s>", event.sk_keyName)) {
            Normal.toggleBlacklist();
            self.exit();
            event.sk_stopPropagation = true;
        }
    });

    return self;
})(Mode);

var PassThrough = (function(mode) {
    var self = $.extend({
        name: "PassThrough",
        statusLine: "",
        eventListeners: {}
    }, mode);

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
    }).addEventListener('mousedown', function(event) {
        event.sk_suppressed = true;
    });

    return self;
})(Mode);

var Normal = (function(mode) {
    var self = $.extend({name: "Normal", eventListeners: {}}, mode);

    // Enable to stop propagation of the event whose keydown handler has been triggered
    // Why we need this?
    // For example, there is keyup event handler of `s` on some site to set focus on an input box,
    // Now user presses `sg` to search with google, Surfingkeys got `s` and triggered its keydown handler.
    // But keyup handler of the site also got triggered, then `g` was swallowed by the input box.
    // This setting now is only turned on for Normal.
    // For Hints, we could not turn on it, as keyup should be propagated to Normal
    // to stop scrolling when holding a key.
    self.enableKeyupMerging = true;

    // let next focus event pass
    var _passFocus = false;
    self.passFocus = function(pf) {
        _passFocus = pf;
    };

    self.enter = function() {
        mode.enter.apply(self, arguments);
        if (runtime.conf.stealFocusOnLoad && !Front.isProvider()) {
            var elm = getRealEdit();
            elm && elm.blur();
        }
    };

    self.addEventListener('keydown', function(event) {
        var realTarget = getRealEdit(event);
        if (isEditable(realTarget)) {
            if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
                realTarget.blur();
                Insert.exit();
            } else if (event.key === "Tab"){
                // enable Tab key to focus next input
                Normal.passFocus(true);
                Insert.enter(realTarget);
            }
        } else if (Mode.isSpecialKeyOf("<Alt-s>", event.sk_keyName)) {
            self.toggleBlacklist();
            event.sk_stopPropagation = true;
        } else if (event.sk_keyName.length) {
            self._handleMapKey(event);
        }
        self.passFocus(runtime.conf.enableAutoFocus);
    });
    self.addEventListener('blur', function(event) {
        keyHeld = false;
    });
    self.addEventListener('focus', function(event) {
        Mode.showStatus();
        if (runtime.conf.stealFocusOnLoad && !Front.isProvider()) {
            var elm = getRealEdit(event);
            if (isEditable(elm)) {
                if (_passFocus) {
                    if (!runtime.conf.enableAutoFocus) {
                        // prevent focus on input only when enableAutoFocus is turned off.
                        _passFocus = false;
                    }
                } else {
                    elm.blur();
                    event.sk_stopPropagation = true;
                }
            }
        }
    });
    self.addEventListener('keyup', function(event) {
        setTimeout(function() {
            keyHeld = false;
        }, 0);
    });
    self.addEventListener('mousedown', function(event) {
        // The isTrusted read-only property of the Event interface is a boolean
        // that is true when the event was generated by a user action, and false
        // when the event was created or modified by a script or dispatched via dispatchEvent.

        // enable only mouse click from human being to focus input
        if (runtime.conf.enableAutoFocus) {
            self.passFocus(true);
        } else {
            self.passFocus(event.isTrusted);
        }

        var realTarget = getRealEdit(event);
        if (isEditable(realTarget)) {
            Insert.enter(realTarget);
        } else {
            Insert.exit();
        }
    });

    self.toggleBlacklist = function() {
        if (document.location.href.indexOf(chrome.extension.getURL("")) !== 0) {
            runtime.command({
                action: 'toggleBlacklist',
                blacklistPattern: (runtime.conf.blacklistPattern ? runtime.conf.blacklistPattern.toJSON() : "")
            }, function(resp) {
                if (resp.disabled) {
                    Front.showBanner('Surfingkeys turned OFF for ' + resp.url, 3000);
                } else {
                    Front.showBanner('Surfingkeys turned ON for ' + resp.url, 3000);
                }
            });
        } else {
            Front.showBanner('You could not toggle Surfingkeys on its own pages.', 3000);
        }
    };

    self.mappings = new Trie();
    self.map_node = self.mappings;

    self.repeats = "";
    var keyHeld = false;

    var scrollNodes, scrollIndex = 0,
        lastKeys;

    function easeFn(t, b, c, d) {
        // t: current time, b: begInnIng value, c: change In value, d: duration
        return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
    }

    function initScroll(elm) {
        elm.skScrollBy = function(x, y) {
            if (runtime.conf.smoothScroll) {
                var d = Math.max(100, 20 * Math.log(Math.abs( x || y)));
                elm.smoothScrollBy(x, y, d);
            } else {
                $(document).trigger("surfingkeys:scrollStarted");
                elm.scrollLeft = elm.scrollLeft + x;
                elm.scrollTop = elm.scrollTop + y;
                $(document).trigger("surfingkeys:scrollDone");
            }
        };
        if (elm === document.scrollingElement) {
            var f = elm.skScrollBy;
            elm.skScrollBy = function(x, y) {
                if (runtime.conf.smartPageBoundary) {
                    if (document.scrollingElement.scrollTop === 0 && y <= 0) {
                        previousPage() && Front.showBanner("Top margin hit, jump to previous page");
                    } else if (document.scrollingElement.scrollHeight - document.scrollingElement.scrollTop <= window.innerHeight + 1 && y > 0) {
                        nextPage() && Front.showBanner("Bottom margin hit, jump to next page");
                    }
                }
                f.call(elm, x, y);
            };
        }
        elm.smoothScrollBy = function(x, y, d) {
            if (!keyHeld) {
                var [prop, distance] = y ? ['scrollTop', y] : ['scrollLeft', x],
                    duration = d,
                    previousTimestamp = 0,
                    originValue = elm[prop],
                    stepCompleted = false;
                keyHeld = true;
                function step(t) {
                    if (previousTimestamp === 0) {
                        // init previousTimestamp in first step
                        previousTimestamp = t;
                        $(document).trigger("surfingkeys:scrollStarted");
                        return window.requestAnimationFrame(step);
                    }
                    var old = elm[prop], delta = (t - previousTimestamp) * distance / duration;
                    if (Math.abs(old + delta - originValue) >= Math.abs(distance)) {
                        stepCompleted = true;
                        if (keyHeld) {
                            elm[prop] += delta;
                            originValue = elm[prop];
                        } else {
                            elm[prop] = originValue + distance;
                        }
                    } else {
                        elm[prop] += delta;
                    }
                    previousTimestamp = t;

                    if (elm[prop] === old // boundary hit
                        || (!keyHeld && stepCompleted) // distance completed
                    ) {
                        keyHeld = false;
                        $(document).trigger("surfingkeys:scrollDone");
                    } else {
                        return window.requestAnimationFrame(step);
                    }
                }
                return window.requestAnimationFrame(step);
            }
        };
    }

    // set scrollIndex to the highest node
    function initScrollIndex() {
        if (!scrollNodes || scrollNodes.length === 0) {
            $('html, body').css('overflow', 'visible');
            scrollNodes = getScrollableElements(100, 1.1);
            while (scrollNodes.length) {
                var maxHeight = 0;
                scrollIndex = 0;
                scrollNodes.forEach(function(n, i) {
                    var h = n.scrollHeight;
                    if (h > maxHeight) {
                        scrollIndex = i;
                        maxHeight = h;
                    }
                });
                var sn = scrollNodes[scrollIndex];
                if (sn === document.scrollingElement) {
                    break;
                } else {
                    sn.scrollIntoViewIfNeeded();
                    if (isElementPartiallyInViewport(sn)) {
                        break;
                    } else {
                        // remove the node that could not be scrolled into view.
                        scrollNodes.splice(scrollIndex, 1);
                    }
                }
            }
        }
    }

    function getScrollableElements() {
        var nodes = [];
        if (document.scrollingElement.scrollHeight > window.innerHeight
            || document.scrollingElement.scrollWidth > window.innerWidth) {
            nodes.push(document.scrollingElement);
        }
        var nodeIterator = document.createNodeIterator(
            document.body,
            NodeFilter.SHOW_ELEMENT, {
                acceptNode: function(node) {
                    return ((hasScroll(node, 'y', 16) || hasScroll(node, 'x', 16)) && $(node).is(":visible")) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            });
        for (var node; node = nodeIterator.nextNode(); nodes.push(node));

        return nodes;
    }

    function _highlightElement(elm) {
        var rc = elm.getBoundingClientRect();
        Front.highlightElement({
            duration: 200,
            rect: {
                top: rc.top,
                left: rc.left,
                width: rc.width,
                height: rc.height
            }
        });
    }
    self.changeScrollTarget = function(silent) {
        scrollNodes = getScrollableElements(100, 1.1);
        if (scrollNodes.length > 0) {
            scrollIndex = (scrollIndex + 1) % scrollNodes.length;
            var sn = scrollNodes[scrollIndex];
            sn.scrollIntoViewIfNeeded();
            while (!isElementPartiallyInViewport(sn) && scrollNodes.length) {
                // remove the node that could not be scrolled into view.
                scrollNodes.splice(scrollIndex, 1);
                scrollIndex = scrollIndex % scrollNodes.length;
                sn = scrollNodes[scrollIndex];
                sn.scrollIntoViewIfNeeded();
            }
            if (!silent) {
                _highlightElement(sn);
            }
        }
    };
    self.resetScrollTarget = function() {
        scrollNodes = null;
        initScrollIndex();
        if (scrollNodes.length > 0) {
            scrollNode = scrollNodes[scrollIndex];
            _highlightElement(scrollNode);
        }
    };

    self.scroll = function(type) {
        initScrollIndex();
        var scrollNode = document.scrollingElement;
        if (scrollNodes.length > 0) {
            scrollNode = scrollNodes[scrollIndex];
            if (!$(scrollNode).is(':visible')) {
                self.changeScrollTarget(true);
                scrollNode = scrollNodes[scrollIndex];
            }
        }
        if (!scrollNode.skScrollBy) {
            initScroll(scrollNode);
        }
        var size = (scrollNode === document.scrollingElement) ? [window.innerWidth, window.innerHeight] : [scrollNode.offsetWidth, scrollNode.offsetHeight];
        switch (type) {
            case 'down':
                scrollNode.skScrollBy(0, runtime.conf.scrollStepSize);
                break;
            case 'up':
                scrollNode.skScrollBy(0, -runtime.conf.scrollStepSize);
                break;
            case 'pageDown':
                scrollNode.skScrollBy(0, Math.round(size[1] / 2));
                break;
            case 'fullPageDown':
                scrollNode.skScrollBy(0, size[1]);
                break;
            case 'pageUp':
                scrollNode.skScrollBy(0, -Math.round(size[1] / 2));
                break;
            case 'fullPageUp':
                scrollNode.skScrollBy(0, -size[1]);
                break;
            case 'top':
                scrollNode.skScrollBy(0, -scrollNode.scrollTop);
                break;
            case 'bottom':
                scrollNode.skScrollBy(scrollNode.scrollLeft, scrollNode.scrollHeight - scrollNode.scrollTop);
                break;
            case 'left':
                scrollNode.skScrollBy(-Math.round(runtime.conf.scrollStepSize / 2), 0);
                break;
            case 'right':
                scrollNode.skScrollBy(Math.round(runtime.conf.scrollStepSize / 2), 0);
                break;
            case 'leftmost':
                scrollNode.skScrollBy(-scrollNode.scrollLeft - 10, 0);
                break;
            case 'rightmost':
                scrollNode.skScrollBy(scrollNode.scrollWidth - scrollNode.scrollLeft - size[0] + 20, 0);
                break;
            default:
                break;
        }
    };

    self.rotateFrame = function() {
        RUNTIME('nextFrame');
    };

    function _finish(mode) {
        var ret = false;
        if (mode.map_node !== mode.mappings || mode.pendingMap != null || mode.repeats) {
            mode.map_node = mode.mappings;
            mode.pendingMap = null;
            mode.isTrustedEvent && Front.hideKeystroke();
            if (mode.repeats) {
                mode.repeats = "";
            }
            ret = true;
        }
        return ret;
    };

    self._handleMapKey = function(event, onNoMatched) {
        var thisMode = this,
            key = event.sk_keyName;
        this.isTrustedEvent = event.isTrusted;

        if (Mode.isSpecialKeyOf("<Esc>", key) && _finish(this)) {
            event.sk_stopPropagation = true;
            event.sk_suppressed = true;
        } else if (this.pendingMap) {
            this.setLastKeys && this.setLastKeys(this.map_node.meta.word + key);
            var pf = this.pendingMap.bind(this);
            event.sk_stopPropagation = !this.map_node.meta.keepPropagation;
            setTimeout(function() {
                pf(key);
                _finish(thisMode);
                thisMode.postHandler(event);
            }, 0);
        } else if (this.repeats !== undefined &&
            this.map_node === this.mappings && (key >= "1" || (this.repeats !== "" && key >= "0")) && key <= "9") {
            // reset only after target action executed or cancelled
            this.repeats += key;
            this.isTrustedEvent && Front.showKeystroke(key, this.name);
            event.sk_stopPropagation = true;
        } else {
            var last = this.map_node;
            this.map_node = this.map_node.find(key);
            if (!this.map_node) {
                onNoMatched && onNoMatched(last);
                event.sk_suppressed = (last !== this.mappings);
                _finish(this);
            } else {
                if (this.map_node.meta) {
                    var code = this.map_node.meta.code;
                    if (code.length) {
                        // bound function needs arguments
                        this.pendingMap = code;
                        this.isTrustedEvent && Front.showKeystroke(key, this.name);
                        event.sk_stopPropagation = true;
                    } else {
                        this.setLastKeys && this.setLastKeys(this.map_node.meta.word);
                        RUNTIME.repeats = parseInt(this.repeats) || 1;
                        event.sk_stopPropagation = !this.map_node.meta.keepPropagation;
                        setTimeout(function() {
                            while(RUNTIME.repeats > 0) {
                                code();
                                RUNTIME.repeats--;
                            }
                            _finish(thisMode);
                            thisMode.postHandler(event);
                        }, 0);
                    }
                } else {
                    this.isTrustedEvent && Front.showKeystroke(key, this.name);
                    event.sk_stopPropagation = true;
                }
            }
        }
    };

    self.feedkeys = function(keys) {
        setTimeout(function() {
            var evt = new Event("keydown");
            for (var i = 0; i < keys.length; i ++) {
                evt.sk_keyName = keys[i];
                self._handleMapKey(evt);
            }
        }, 1);
    };

    self.setLastKeys = function(key) {
        if (!this.map_node.meta.repeatIgnore) {
            lastKeys = [key];
            saveLastKeys();
        }
    };

    function saveLastKeys() {
        RUNTIME('localData', {
            data: {
                lastKeys: lastKeys
            }
        });
    }

    self.appendKeysForRepeat = function(mode, keys) {
        if (lastKeys && lastKeys.length > 0) {
            // keys for normal mode must be pushed.
            lastKeys.push('{0}\t{1}'.format(mode, keys));
            saveLastKeys();
        }
    };

    self.repeatLast = function() {
        // lastKeys in format: <keys in normal mode>[,(<mode name>\t<keys in this mode>)*], examples
        // ['se']
        // ['f', 'Hints\tBA']
        lastKeys = runtime.conf.lastKeys;
        self.feedkeys(lastKeys[0]);
        var modeKeys = lastKeys.slice(1);
        for (var i = 0; i < modeKeys.length; i++) {
            var modeKey = modeKeys[i].split('\t');
            if (modeKey[0] === 'Hints') {
                function closureWrapper() {
                    var hints = modeKey[1];
                    return function() {
                        Hints.feedkeys(hints);
                    };
                }
                setTimeout(closureWrapper(), 120 + i*100);
            }
        }
    };

    var localMarks = {};
    self.addVIMark = function(mark, url) {
        if (/^[a-z]$/.test(mark)) {
            // local mark
            localMarks[mark] = {
                scrollLeft: document.scrollingElement.scrollLeft,
                scrollTop: document.scrollingElement.scrollTop
            };
        } else {
            // global mark
            url = url || window.location.href;
            var mo = {};
            mo[mark] = {
                url: url,
                scrollLeft: document.scrollingElement.scrollLeft,
                scrollTop: document.scrollingElement.scrollTop
            };
            RUNTIME('addVIMark', {mark: mo});
            Front.showBanner("Mark '{0}' added for: {1}.".format(mark, url));
        }
    };

    self.jumpVIMark = function(mark, newTab) {
        if (localMarks.hasOwnProperty(mark)) {
            var markInfo = localMarks[mark];
            document.scrollingElement.scrollLeft = markInfo.scrollLeft;
            document.scrollingElement.scrollTop = markInfo.scrollTop;
        } else {
            runtime.command({
                action: 'getSettings',
                key: 'marks'
            }, function(response) {
                var marks = response.settings.marks;
                if (marks.hasOwnProperty(mark)) {
                    var markInfo = marks[mark];
                    if (typeof(markInfo) === "string") {
                        markInfo = {
                            url: markInfo,
                            scrollLeft: 0,
                            scrollTop: 0
                        };
                    }
                    markInfo.tab = {
                        tabbed: newTab,
                        active: true
                    };
                    RUNTIME("openLink", markInfo);
                } else {
                    Front.showBanner("No mark '{0}' defined.".format(mark));
                }
            });
        }
    };

    self.insertJS = function(code, onload) {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        if (typeof(code) === 'function') {
            s.innerHTML = "(" + code.toString() + ")(window);";
        } else {
            s.src = code;
            s.onload = onload;
        }
        document.lastElementChild.appendChild(s);
        s.remove();
    };

    self.moveTab = function(pos) {
        RUNTIME('moveTab', {
            position: pos
        });
    };

    self.captureElement = function(elm) {
        runtime.command({
            action: 'getCaptureSize'
        }, function(response) {
            var scale = response.width / window.innerWidth;

            elm.scrollTop = 0;
            elm.scrollLeft = 0;
            var lastScrollTop = -1, lastScrollLeft = -1;
            // hide scrollbars
            var overflowY = elm.style.overflowY;
            elm.style.overflowY = "hidden";
            var overflowX = elm.style.overflowX;
            elm.style.overflowX = "hidden";
            // hide borders
            var borderStyle = elm.style.borderStyle;
            elm.style.borderStyle = "none";
            Front.toggleStatus(false);

            var dx = 0, dy = 0, sx, sy, sw, sh, ww, wh, dh = elm.scrollHeight, dw = elm.scrollWidth;
            if (elm === document.scrollingElement) {
                ww = window.innerWidth;
                wh = window.innerHeight;
                sx = 0;
                sy = 0;
            } else {
                var br = elm.getBoundingClientRect();
                // visible rectangle
                var rc = [
                    Math.max(br.left, 0),
                    Math.max(br.top, 0),
                    Math.min(br.right, window.innerWidth),
                    Math.min(br.bottom, window.innerHeight)
                ];
                ww = rc[2] - rc[0];
                wh = rc[3] - rc[1];
                sx = rc[0] * scale;
                sy = rc[1] * scale;
            }
            sw = ww * scale;
            sh = wh * scale;

            var canvas = document.createElement( "canvas" );
            canvas.width = dw * scale;
            canvas.height = dh * scale;
            var ctx = canvas.getContext( "2d" );

            var br = elm.getBoundingClientRect();
            var img = document.createElement( "img" );

            img.onload = function() {
                ctx.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh);
                if (lastScrollTop === elm.scrollTop) {
                    if (lastScrollLeft === elm.scrollLeft) {
                        // done
                        Front.toggleStatus(true);
                        Front.showPopup("<img src='{0}' />".format(canvas.toDataURL( "image/png" )));
                        // restore overflow
                        elm.style.overflowY = overflowY;
                        elm.style.overflowX = overflowX;
                        // restore borders
                        elm.style.borderStyle = borderStyle;
                    } else {
                        lastScrollTop = -1;
                        elm.scrollTop = 0;
                        dy = 0;
                        lastScrollLeft = elm.scrollLeft;
                        if (elm.scrollLeft + 2 * ww < dw) {
                            elm.scrollLeft += ww;
                            dx += ww * scale;
                        } else {
                            elm.scrollLeft += dw % ww;
                            dx = elm.scrollLeft * scale;
                        }
                        setTimeout(function() {
                            runtime.command({
                                action: 'captureVisibleTab'
                            }, function(response) {
                                img.src = response.dataUrl;
                            });
                        }, 100);
                    }
                } else {
                    lastScrollTop = elm.scrollTop;
                    if (elm.scrollTop + 2 * wh < dh) {
                        elm.scrollTop += wh;
                        dy += wh * scale;
                    } else {
                        elm.scrollTop += dh % wh;
                        dy = elm.scrollTop * scale;
                    }
                    setTimeout(function() {
                        runtime.command({
                            action: 'captureVisibleTab'
                        }, function(response) {
                            img.src = response.dataUrl;
                        });
                    }, 100);
                }
            };

            // wait 500 millisecond for keystrokes of Surfingkeys to hide
            setTimeout(function() {
                runtime.command({
                    action: 'captureVisibleTab'
                }, function(response) {
                    img.src = response.dataUrl;
                });
            }, 500);

        });
    };

    self.captureFullPage = function() {
        self.captureElement(document.scrollingElement);
    };

    self.captureScrollingElement = function() {
        var scrollNode = document.scrollingElement;
        initScrollIndex();
        if (scrollNodes.length > 0) {
            scrollNode = scrollNodes[scrollIndex];
        }
        self.captureElement(scrollNode);
    };

    return self;
})(Mode);
