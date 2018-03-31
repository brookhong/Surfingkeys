/**
 * The status bar displays the status of Surfingkeys current mode: Normal, visual, etc.
 *
 * @kind function
 *
 * @param {Object} ui
 * @return {StatusBar} StatusBar instance
 */
var StatusBar = (function(ui) {
    var self = {};

    var timerHide = null;

    // mode: 0
    // search: 1
    // searchResult: 2
    // proxy: 3
    self.show = function(n, content, duration) {
        if (timerHide) {
            clearTimeout(timerHide);
            timerHide = null;
        }
        var span = ui.find('span');
        if (n < 0) {
            span.html("");
        } else {
            $(span[n]).html("").append(content);
        }
        var lastSpan = -1;
        for (var i = 0; i < span.length; i++) {
            if ($(span[i]).html().length) {
                lastSpan = i;
                $(span[i]).css('padding', '0px 8px');
                $(span[i]).css('border-right', '1px solid #999');
            } else {
                $(span[i]).css('padding', '');
                $(span[i]).css('border-right', '');
            }
        }
        $(span[lastSpan]).css('border-right', '');
        ui.css('display', lastSpan === -1 ? 'none' : 'block');
        Front.flush();
        if (duration) {
            timerHide = setTimeout(function() {
                self.show(n, "");
            }, duration);
        }
    };
    return self;
})(Front.statusBar);

var Find = (function() {
    var self = new Mode("Find", "/");

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
    }).addEventListener('mousedown', function(event) {
        event.sk_suppressed = true;
    });

    var input = $('<input id="sk_find" class="sk_theme"/>');
    var historyInc;
    function reset() {
        input.val('');
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
        StatusBar.show(1, input);
        input.on('input', function() {
            Front.visualCommand({
                action: 'visualUpdate',
                query: input.val()
            });
        });
        var findHistory = [];
        runtime.command({
            action: 'getSettings',
            key: 'findHistory'
        }, function(response) {
            findHistory = response.settings.findHistory;
        });
        input[0].onkeydown = function(event) {
            if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
                reset();
                Front.visualCommand({
                    action: 'visualClear'
                });
            } else if (event.keyCode === KeyboardUtils.keyCodes.enter) {
                var query = input.val();
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
                    input.val(query);
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
