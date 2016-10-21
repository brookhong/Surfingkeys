var Mode = (function() {
    var self = {}, mode_stack = [];
    self.specialKeys = {
        "<Alt-s>": ["<Alt-s>"],       // hotkey to toggleBlacklist
        "<Ctrl-d>": ["<Ctrl-d>"],     // hotkey to delete from omnibar
        "<Esc>": ["<Esc>"]
    };

    self.isSpecialKeyOf = function(specialKey, keyToCheck) {
        return (-1 !== self.specialKeys[specialKey].indexOf(keyToCheck));
    };

    self.addEventListener = function(evt, handler) {
        var mode_name = this.name;
        this.eventListeners[evt] = function(event) {
            if (event.type === "keydown" && !event.hasOwnProperty('sk_keyName')) {
                event.sk_keyName = KeyboardUtils.getKeyChar(event);
            }

            if (!event.hasOwnProperty('sk_suppressed')) {
                var ret = handler(event);
                if (ret === "stopEventPropagation") {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                    this.stopKeyupPropagation = true;
                }
            }
        };
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

    self.enter = function(priority) {
        // we need clear the modes stack first to make sure eventListeners of this mode added at first.
        popModes(mode_stack);

        var pos = mode_stack.indexOf(this);
        this.priority = priority || mode_stack.length;

        if (pos === -1) {
            // push this mode into stack
            mode_stack.unshift(this);
        } else if (pos > 0) {
            // pop up all the modes over this
            // mode_stack = mode_stack.slice(pos);
            Front.showPopup(this.name + "@ : " + Mode.stack().map(function(u) { return u.name; }).join(','));
        }

        mode_stack.sort(function(a,b) {
            return (a.priority < b.priority) ? 1 : ((b.priority < a.priority) ? -1 : 0);
        } );
        pushModes(mode_stack);
        // var modes = mode_stack.map(function(m) {
            // return m.name;
        // }).join('->');
        // console.log('enter {0}, {1}'.format(this.name, modes));
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
    };

    self.stack = function() {
        return mode_stack;
    };

    return self;
})();

var Disabled = (function(mode) {
    var self = $.extend({name: "Disabled", eventListeners: {}}, mode);

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
        if (Mode.isSpecialKeyOf("<Alt-s>", event.sk_keyName)) {
            Normal.toggleBlacklist(window.location.origin);
            self.exit();
            return "stopEventPropagation";
        }
    });

    return self;
})(Mode);

var PassThrough = (function(mode) {
    var self = $.extend({name: "PassThrough", eventListeners: {}}, mode);

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
    }).addEventListener('mousedown', function(event) {
        event.sk_suppressed = true;
    });

    return self;
})(Mode);

var GetBackFocus = (function(mode) {
    var self = $.extend({name: "GetBackFocus", eventListeners: {}}, mode);

    self.addEventListener('focus', function(event) {
        var handled = "", elm = event.target;
        if (isEditable(elm)) {
            elm.blur();
            handled = "stopEventPropagation";
        }
        return handled;
    });

    self.enter = function() {
        mode.enter.call(self);
        document.activeElement.blur();
    };

    self.addEventListener('mousedown', function(event) {
        self.exit();
    });

    self.addEventListener('keydown', function(event) {
        self.exit();
    });

    return self;
})(Mode);

var Insert = (function(mode) {
    var self = $.extend({name: "Insert", eventListeners: {}}, mode);

    self.mappings = new Trie();
    self.map_node = self.mappings;

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            document.activeElement.blur();
            self.exit();
            return "stopEventPropagation";
        } else if (!isEditable(event.target)) {
            self.exit();
        } else if (KeyboardUtils.keyCodes.enter === event.keyCode && event.target.localName === "input") {
            setTimeout(function() {
                event.target.blur();
                self.exit();
            }, 0);
        } else if (event.sk_keyName.length) {
            return Normal._handleMapKey.call(self, event.sk_keyName);
        }
    });
    self.addEventListener('focus', function(event) {
        if (!isEditable(event.target)) {
            self.exit();
        }
    });

    return self;
})(Mode);

var Normal = (function(mode) {
    var self = $.extend({name: "Normal", eventListeners: {}}, mode);

    self.addEventListener('keydown', function(event) {
        var handled;
        if (isEditable(event.target)) {
            Insert.enter();
        } else if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            handled = self.finish();
        } else if (Mode.isSpecialKeyOf("<Alt-s>", event.sk_keyName)) {
            self.toggleBlacklist(window.location.origin);
            handled = "stopEventPropagation";
        } else if (event.sk_keyName.length) {
            handled = self._handleMapKey(event.sk_keyName);
        }
        return handled;
    });
    self.addEventListener('keyup', function(event) {
        Normal.surfingkeysHold = 0;
        if (self.stopKeyupPropagation) {
            event.stopImmediatePropagation();
            self.stopKeyupPropagation = false;
        }
    });
    self.addEventListener('pushState', function(event) {
        if (typeof(TopHooker) === "undefined" || Mode.stack()[0] !== TopHooker) {
            // only for that we are not having TopHooker mode.
            Insert.exit();
            GetBackFocus.enter();
        }
    });
    self.addEventListener('mousedown', function(event) {
        if (isEditable(event.target)) {
            Insert.enter();
        } else {
            Insert.exit();
        }
    });

    self.toggleBlacklist = function(domain) {
        RUNTIME('toggleBlacklist', {
            domain: domain
        });
    };

    self.mappings = new Trie();
    self.map_node = self.mappings;
    self.repeats = "";
    self.surfingkeysHold = 0;

    var stepSize = 70,
        scrollNodes, scrollIndex = 0,
        lastKeys;

    function easeFn(t, b, c, d) {
        // t: current time, b: begInnIng value, c: change In value, d: duration
        return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
    }

    function initScroll(elm) {
        elm.skScrollBy = function(x, y, d) {
            if (runtime.conf.smoothScroll) {
                elm.smoothScrollBy(x, y, d);
            } else {
                elm.scrollLeft = elm.scrollLeft + x;
                elm.scrollTop = elm.scrollTop + y;
            }
        };
        elm.smoothScrollBy = function(x, y, d) {
            // surfingkeysHold:
            // 0 - smoothScroll not started
            // 1 - smoothScroll just started
            // 2 - smoothScroll transfered to normal scroll because user holds the key
            if (self.surfingkeysHold === 0) {
                var x0 = elm.scrollLeft,
                    y0 = elm.scrollTop,
                    start = window.performance.now();

                function step(timestamp) {
                    elm.scrollLeft = easeFn(timestamp - start, x0, x, d);
                    elm.scrollTop = easeFn(timestamp - start, y0, y, d);
                    if (self.surfingkeysHold !== 2 && (timestamp - start) < d) {
                        window.requestAnimationFrame(step);
                    } else if (Math.abs(x) > stepSize || Math.abs(y) > stepSize) {
                        // don't do fine tune for minor scroll
                        elm.scrollLeft = x0 + x;
                        elm.scrollTop = y0 + y;
                    }
                }

                window.requestAnimationFrame(step);
                self.surfingkeysHold++;
            } else if (self.surfingkeysHold === 1) {
                // smoothScroll already started, hold key to keep scroll
                // use no easeFn to keep fixed speed
                function holdStep(timestamp) {
                    elm.scrollLeft = elm.scrollLeft + x / 4;
                    elm.scrollTop = elm.scrollTop + y / 4;
                    if (self.surfingkeysHold === 2) {
                        window.requestAnimationFrame(holdStep);
                    }
                }

                window.requestAnimationFrame(holdStep);
                self.surfingkeysHold++;
            }
        };
    }

    self.hasScroll = function(el, direction, barSize) {
        var offset = (direction === 'y') ? 'scrollTop' : 'scrollLeft';
        var result = el[offset];

        if (result < barSize) {
            // set scroll offset to barSize, and verify if we can get scroll offset as barSize
            var originOffset = el[offset];
            el[offset] = barSize;
            result = el[offset];
            el[offset] = originOffset;
        }
        return result >= barSize && (
            el === document.body
            || $(el).css('overflow-' + direction) === 'auto'
            || $(el).css('overflow-' + direction) === 'scroll');
    }

    function getScrollableElements() {
        var nodes = [];
        var nodeIterator = document.createNodeIterator(
            document.body,
            NodeFilter.SHOW_ELEMENT, {
                acceptNode: function(node) {
                    return (self.hasScroll(node, 'y', 16) || self.hasScroll(node, 'x', 16)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            });
        for (var node; node = nodeIterator.nextNode(); nodes.push(node));
        return nodes;
    }

    self.changeScrollTarget = function() {
        scrollNodes = getScrollableElements(100, 1.1);
        if (scrollNodes.length > 0) {
            scrollIndex = (scrollIndex + 1) % scrollNodes.length;
            var sn = scrollNodes[scrollIndex];
            sn.scrollIntoViewIfNeeded();
            var rc = sn.getBoundingClientRect();
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
    };

    self.scroll = function(type) {
        if (!scrollNodes || scrollNodes.length === 0) {
            scrollNodes = getScrollableElements(100, 1.1);
        } else {
            scrollNodes = scrollNodes.filter(function(n) {
                return $(n).is(":visible");
            });
            if (scrollIndex >= scrollNodes.length) {
                scrollIndex = 0;
            }
        }
        if (scrollNodes.length === 0) {
            return;
        }
        var scrollNode = scrollNodes[scrollIndex];
        if (!scrollNode.skScrollBy) {
            initScroll(scrollNode);
        }
        var size = (scrollNode === document.body) ? [window.innerWidth, window.innerHeight] : [scrollNode.offsetWidth, scrollNode.offsetHeight];
        switch (type) {
            case 'down':
                scrollNode.skScrollBy(0, stepSize, 500);
                break;
            case 'up':
                scrollNode.skScrollBy(0, -stepSize, 500);
                break;
            case 'pageDown':
                scrollNode.skScrollBy(0, size[1] / 2, 500);
                break;
            case 'fullPageDown':
                scrollNode.skScrollBy(0, size[1], 500);
                break;
            case 'pageUp':
                scrollNode.skScrollBy(0, -size[1] / 2, 500);
                break;
            case 'fullPageUp':
                scrollNode.skScrollBy(0, -size[1], 500);
                break;
            case 'top':
                scrollNode.skScrollBy(0, -scrollNode.scrollTop, 500);
                break;
            case 'bottom':
                scrollNode.skScrollBy(scrollNode.scrollLeft, scrollNode.scrollHeight - scrollNode.scrollTop, 500);
                break;
            case 'left':
                scrollNode.skScrollBy(-stepSize / 2, 0, 500);
                break;
            case 'right':
                scrollNode.skScrollBy(stepSize / 2, 0, 500);
                break;
            case 'leftmost':
                scrollNode.skScrollBy(-scrollNode.scrollLeft - 10, 0, 500);
                break;
            case 'rightmost':
                scrollNode.skScrollBy(scrollNode.scrollWidth - scrollNode.scrollLeft - size[0] + 20, 0, 500);
                break;
            default:
                break;
        }
    };

    self.rotateFrame = function() {
        RUNTIME('nextFrame');
    };

    self.finish = function() {
        var ret = "";
        if (this.map_node !== this.mappings || this.pendingMap != null || this.repeats) {
            this.map_node = this.mappings;
            this.pendingMap = null;
            Front.hideKeystroke();
            if (this.repeats) {
                this.repeats = "";
            }
            ret = "stopEventPropagation";
        }
        return ret;
    };

    self._handleMapKey = function(key) {
        var ret = "";
        var finish = self.finish.bind(this);
        if (this.pendingMap) {
            if (key == "<Esc>" || key == "<Ctrl-[>") {
                finish();
            } else {
                this.setLastKeys && this.setLastKeys(this.map_node.meta.word + key);
                var pf = this.pendingMap.bind(this);
                setTimeout(function() {
                    pf(key);
                    finish();
                }, 0);
            }
            ret = "stopEventPropagation";
        } else if (this.repeats !== undefined &&
            this.map_node === this.mappings && (key >= "1" || (this.repeats !== "" && key >= "0")) && key <= "9") {
            // reset only after target action executed or cancelled
            this.repeats += key;
            Front.showKeystroke(key);
            ret = "stopEventPropagation";
        } else {
            this.map_node = this.map_node.find(key);
            if (!this.map_node) {
                finish();
            } else {
                if (this.map_node.meta) {
                    var code = this.map_node.meta.code;
                    if (this.map_node.meta.extra_chars) {
                        this.pendingMap = code;
                        Front.showKeystroke(key);
                    } else {
                        this.setLastKeys && this.setLastKeys(this.map_node.meta.word);
                        RUNTIME.repeats = parseInt(this.repeats) || 1;
                        setTimeout(function() {
                            while(RUNTIME.repeats > 0) {
                                code();
                                RUNTIME.repeats--;
                            }
                            finish();
                        }, 0);
                    }
                } else {
                    Front.showKeystroke(key);
                }
                ret = "stopEventPropagation";
            }
        }
        return ret;
    };

    self.feedkeys = function(keys) {
        setTimeout(function() {
            for (var i = 0; i < keys.length; i ++) {
                self._handleMapKey(keys[i]);
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
        RUNTIME('updateSettings', {
            settings: {
                lastKeys: lastKeys
            }
        });
    }

    self.appendKeysForRepeat = function(mode, keys) {
        if (lastKeys.length > 0) {
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
                setTimeout(function() {
                    Hints.feedkeys(modeKey[1]);
                }, 120 + i*100);
            }
        }
    };

    var localMarks = {};
    self.addVIMark = function(mark, url) {
        if (/^[a-z]$/.test(mark)) {
            // local mark
            localMarks[mark] = {
                scrollLeft: document.body.scrollLeft,
                scrollTop: document.body.scrollTop
            };
        } else {
            // global mark
            url = url || window.location.href;
            var mo = {};
            mo[mark] = {
                url: url,
                scrollLeft: document.body.scrollLeft,
                scrollTop: document.body.scrollTop
            };
            RUNTIME('addVIMark', {mark: mo});
            Front.showBanner("Mark '{0}' added for: {1}.".format(htmlEncode(mark), url));
        }
    };

    self.jumpVIMark = function(mark) {
        if (localMarks.hasOwnProperty(mark)) {
            var markInfo = localMarks[mark];
            document.body.scrollLeft = markInfo.scrollLeft;
            document.body.scrollTop = markInfo.scrollTop;
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
                        }
                    }
                    markInfo.tab = {
                        tabbed: false,
                        active: true
                    };
                    RUNTIME("openLink", markInfo);
                } else {
                    Front.showBanner("No mark '{0}' defined.".format(htmlEncode(mark)));
                }
            });
        }
    };

    self.resetSettings = function() {
        RUNTIME("resetSettings");
        Front.showBanner("Settings reset.");
    };

    self.insertJS = function(code, onload) {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        if (typeof(code) === 'function') {
            s.innerText = "(" + code.toString() + ")(window);";
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

    return self;
})(Mode);
