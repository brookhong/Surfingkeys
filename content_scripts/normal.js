var Normal = (function() {
    var self = {};
    self.mappings = new Trie('', Trie.SORT_NONE);
    self.map_node = self.mappings;
    self.surfingkeysHold = 0;

    var stepSize = 70,
        scrollNodes, scrollIndex = 0;

    function easeFn(t, b, c, d) {
        // t: current time, b: begInnIng value, c: change In value, d: duration
        return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
    }

    function initScroll(elm) {
        elm.skScrollBy = function(x, y, d) {
            if (runtime.settings.smoothScroll && (Math.abs(x) > stepSize || Math.abs(y) > stepSize)) {
                elm.smoothScrollBy(x, y, d);
            } else {
                elm.scrollLeft = elm.scrollLeft + x;
                elm.scrollTop = elm.scrollTop + y;
            }
        };
        elm.smoothScrollBy = function(x, y, d) {
            if (self.surfingkeysHold === 0) {
                var x0 = elm.scrollLeft,
                    y0 = elm.scrollTop,
                    start = window.performance.now();

                function step(timestamp) {
                    elm.scrollLeft = easeFn(timestamp - start, x0, x, d);
                    elm.scrollTop = easeFn(timestamp - start, y0, y, d);
                    if (self.surfingkeysHold !== 2 && (timestamp - start) < d) {
                        window.requestAnimationFrame(step);
                    } else {
                        elm.scrollLeft = x0 + x;
                        elm.scrollTop = y0 + y;
                    }
                }

                window.requestAnimationFrame(step);
                self.surfingkeysHold++;
            } else if (self.surfingkeysHold === 1) {
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

    function getScrollableElements(minHeight, minRatio) {
        var nodes = [];
        if (window.innerHeight < document.body.scrollHeight) {
            nodes.push(document.body);
        }
        var nodeIterator = document.createNodeIterator(
            document.body,
            NodeFilter.SHOW_ELEMENT, {
                acceptNode: function(node) {
                    return (node !== document.body && node.scrollHeight / node.offsetHeight >= minRatio && node.offsetHeight > minHeight) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            });
        for (var node; node = nodeIterator.nextNode(); nodes.push(node));
        return nodes;
    }

    function renderMappings(mappings) {
        var tb = $('<table/>'),
            words = mappings.getWords();
        var left = words.length % 2;
        for (var i = 0; i < words.length - left; i += 2) {
            $("<tr><td class=keyboard><kbd>{0}</kbd></td><td class=annotation>{1}</td><td class=keyboard><kbd>{2}</kbd></td><td class=annotation>{3}</td></tr>".format(words[i], mappings.find(words[i]).meta[0].annotation, words[i + 1], mappings.find(words[i + 1]).meta[0].annotation)).appendTo(tb);
        }
        if (left) {
            var w = words[words.length - 1];
            $("<tr><td class=keyboard><kbd>{0}</kbd></td><td class=annotation>{1}</td><td></td><td></td></tr>".format(w, mappings.find(w).meta[0].annotation)).appendTo(tb);
        }
        return tb;
    }

    self.highlightElement = function(sn) {
        var rc = sn.getBoundingClientRect();
        runtime.frontendCommand({
            action: 'highlightElement',
            rect: {
                top: rc.top,
                left: rc.left,
                width: rc.width,
                height: rc.height
            }
        });
    };

    function isElementPartiallyInViewport(el) {
        var rect = el.getBoundingClientRect();
        var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
        var windowWidth = (window.innerWidth || document.documentElement.clientWidth);

        var vertInView = (rect.top <= windowHeight) && ((rect.top + rect.height) >= 0);
        var horInView = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0);

        return (vertInView && horInView);
    }

    self.changeScrollTarget = function() {
        scrollNodes = getScrollableElements(100, 1.2);
        if (scrollNodes.length > 0) {
            scrollIndex = (scrollIndex + 1) % scrollNodes.length;
            var sn = scrollNodes[scrollIndex];
            if (!isElementPartiallyInViewport(sn)) {
                sn.scrollIntoView();
            }
            self.highlightElement(sn);
        }
    };

    self.scroll = function(type, repeats) {
        if (!scrollNodes) {
            scrollNodes = getScrollableElements(100, 1.2);
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
        repeats = repeats || 1;
        switch (type) {
            case 'down':
                scrollNode.skScrollBy(0, repeats * stepSize, 500);
                break;
            case 'up':
                scrollNode.skScrollBy(0, -repeats * stepSize, 500);
                break;
            case 'pageDown':
                scrollNode.skScrollBy(0, repeats * size[1] / 2, 500);
                break;
            case 'fullPageDown':
                scrollNode.skScrollBy(0, repeats * size[1], 500);
                break;
            case 'pageUp':
                scrollNode.skScrollBy(0, -repeats * size[1] / 2, 500);
                break;
            case 'fullPageUp':
                scrollNode.skScrollBy(0, -repeats * size[1], 500);
                break;
            case 'top':
                scrollNode.skScrollBy(0, -scrollNode.scrollTop, 500);
                break;
            case 'bottom':
                scrollNode.skScrollBy(scrollNode.scrollLeft, scrollNode.scrollHeight - scrollNode.scrollTop, 500);
                break;
            case 'left':
                scrollNode.skScrollBy(repeats * -stepSize / 2, 0, 500);
                break;
            case 'right':
                scrollNode.skScrollBy(repeats * stepSize / 2, 0, 500);
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

    self.showUsage = function() {
        var _usage = $('<div/>');
        renderMappings(self.mappings).appendTo(_usage);
        $("<p style='float:right; width:100%; text-align:right'>").html("<a id='moreHelp' href='#' style='color:#0095dd'>Show Mappings in Visual mode</a> | <a href='https://github.com/brookhong/surfingkeys' target='_blank' style='color:#0095dd'>More help</a>").appendTo(_usage);
        renderMappings(Visual.mappings).attr('class', 'sk_visualUsage').appendTo(_usage).hide();
        runtime.frontendCommand({
            action: 'showUsage',
            content: _usage.html(),
        });
    };

    self.showPopup = function(content) {
        runtime.frontendCommand({
            action: 'showPopup',
            content: content
        });
    };

    self.chooseTab = function() {
        runtime.frontendCommand({
            action: 'chooseTab'
        });
    };

    self.openOmnibar = function(args) {
        args.action = 'openOmnibar';
        runtime.frontendCommand(args);
    };

    self.openFinder = function() {
        runtime.frontendCommand({
            action: "openFinder"
        });
    };

    self.showBanner = function(msg, linger_time) {
        runtime.frontendCommand({
            action: "showBanner",
            content: msg,
            linger_time: linger_time
        });
    };

    self.showBubble = function(pos, msg) {
        runtime.frontendCommand({
            action: "showBubble",
            content: msg,
            position: pos
        });
    };

    self.hideBubble = function() {
        runtime.frontendCommand({
            action: 'hideBubble'
        });
    };

    self.getContentFromClipboard = function(onReady) {
        runtime.frontendCommand({
            action: 'getContentFromClipboard'
        }, onReady);
    };

    self.writeClipboard = function(text) {
        runtime.frontendCommand({
            action: 'writeClipboard',
            content: text
        });
    };

    self.finish = function() {
        self.map_node = self.mappings;
        self.pendingMap = null;
        runtime.frontendCommand({
            action: 'hideKeystroke'
        });
    };

    self._handleMapKey = function(key) {
        var ret = false;
        var finish = this.finish.bind(this);
        if (this.pendingMap) {
            var pf = this.pendingMap.bind(this);
            setTimeout(function() {
                pf(key);
                finish();
            }, 0);
            ret = true;
        } else {
            this.map_node = this.map_node.find(key);
            if (this.map_node === null) {
                this.finish();
                ret = false;
            } else {
                if (this.map_node.meta.length) {
                    var code = this.map_node.meta[0].code;
                    if (this.map_node.meta[0].extra_chars) {
                        this.pendingMap = code;
                        runtime.frontendCommand({
                            action: 'showKeystroke',
                            key: key
                        });
                    } else {
                        setTimeout(function() {
                            code();
                            finish();
                        }, 0);
                    }
                } else {
                    runtime.frontendCommand({
                        action: 'showKeystroke',
                        key: key
                    });
                }
                ret = true;
            }
        }
        return ret;
    };

    self.handleKeyEvent = function(event, key) {
        var handled = false;
        switch (event.keyCode) {
            case KeyboardUtils.keyCodes.ESC:
                handled = self.finish();
                break;
            default:
                handled = self._handleMapKey(key);
                break;
        }
        return handled;
    };

    self.addVIMark = function(mark, url) {
        url = url || window.location.href;
        runtime.settings.marks[mark] = url;
        RUNTIME('updateSettings', {
            settings: {
                marks: runtime.settings.marks
            }
        });
        self.showBanner("Mark '{0}' added for: {1}.".format(mark, url));
    };

    self.jumpVIMark = function(mark) {
        if (runtime.settings.marks.hasOwnProperty(mark)) {
            RUNTIME("openLink", {
                tab: {
                    tabbed: false,
                    active: true
                },
                url: runtime.settings.marks[mark]
            });
        } else {
            self.showBanner("No mark '{0}' defined.".format(mark));
        }
    };

    self.resetSettings = function() {
        RUNTIME("resetSettings");
        self.showBanner("Settings reset.");
    };

    self.insertJS = function(code) {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        if (typeof(code) === 'function') {
            s.innerText = "(" + code.toString() + ")(window);";
        } else {
            s.src = code;
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
})();
