/**
 * The status bar displays the status of Surfingkeys current mode: Normal, visual, etc.
 *
 * @kind function
 *
 * @param {Object} ui
 * @return {StatusBar} StatusBar instance
 */
var StatusBar = (function() {
    var self = {};
    var timerHide = null;
    var ui = Front.statusBar;

    // mode: 0
    // search: 1
    // searchResult: 2
    // proxy: 3
    self.show = function(n, content, duration) {
        if (timerHide) {
            clearTimeout(timerHide);
            timerHide = null;
        }
        var span = ui.querySelectorAll('span');
        if (n < 0) {
            span.forEach(function(s) {
                setInnerHTML(s, "");
            });
        } else {
            setInnerHTML(span[n], content);
        }
        var lastSpan = -1;
        for (var i = 0; i < span.length; i++) {
            if (span[i].innerHTML.length) {
                lastSpan = i;
                span[i].style.padding = "0px 8px";
                span[i].style.borderRight = "1px solid #999";
            } else {
                span[i].style.padding = "";
                span[i].style.borderRight = "";
            }
        }
        if (lastSpan === -1) {
            ui.style.display = 'none';
        } else {
            span[lastSpan].style.borderRight = "";
            ui.style.display = 'block';
        }
        Front.flush();
        if (duration) {
            timerHide = setTimeout(function() {
                self.show(n, "");
            }, duration);
        }
    };
    return self;
})();

var Find = (function() {
    var self = new Mode("Find", "/");

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
    }).addEventListener('mousedown', function(event) {
        event.sk_suppressed = true;
    });

    var input;
    var historyInc;
    function reset() {
        input = null;
        StatusBar.show(1, "");
        self.exit();
    }

    /**
     * Opens the status bar
     *
     * @memberof StatusBar
     * @instance
     *
     * @return {undefined}
     */
    self.open = function() {
        historyInc = -1;
        StatusBar.show(1, '<input id="sk_find" class="sk_theme"/>');
        input = Front.statusBar.querySelector("input");
        input.oninput = function() {
            Front.visualCommand({
                action: 'visualUpdate',
                query: input.value
            });
        };
        var findHistory = [];
        runtime.command({
            action: 'getSettings',
            key: 'findHistory'
        }, function(response) {
            findHistory = response.settings.findHistory;
        });
        input.onkeydown = function(event) {
            if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
                reset();
                Front.visualCommand({
                    action: 'visualClear'
                });
            } else if (event.keyCode === KeyboardUtils.keyCodes.enter) {
                var query = input.value;
                if (query.length > 0) {
                    if (event.ctrlKey) {
                        query = '\\b' + query + '\\b';
                    }
                    reset();
                    runtime.updateHistory('find', query);
                    Front.visualCommand({
                        action: 'visualEnter',
                        query: query
                    });
                }
            } else if (event.keyCode === KeyboardUtils.keyCodes.upArrow || event.keyCode === KeyboardUtils.keyCodes.downArrow) {
                if (findHistory.length) {
                    historyInc = (event.keyCode === KeyboardUtils.keyCodes.upArrow) ? (historyInc + 1) : (historyInc + findHistory.length - 1);
                    historyInc = historyInc % findHistory.length;
                    var query = findHistory[historyInc];
                    input.value = query;
                    Front.visualCommand({
                        action: 'visualUpdate',
                        query: query
                    });
                }
            }
        };
        input.focus();
        self.enter();
    };
    return self;
})();
