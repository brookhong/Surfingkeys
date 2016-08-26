var StatusBar = (function(ui) {
    var self = {};

    var timerHide = null;
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
                ui.css('display', 'none');
            }, duration);
        }
    };
    return self;
})(Front.statusBar);

var Find = (function() {
    var self = {};

    var input = $('<input id="sk_find" class="sk_theme"/>');
    var historyInc;
    function reset() {
        input.val('');
        StatusBar.show(-1, '');
        PassThrough.exit();
    }

    self.open = function() {
        historyInc = -1;
        StatusBar.show(0, "/");
        StatusBar.show(1, input);
        input.on('input', function() {
            Front.visualCommand({
                action: 'visualUpdate',
                query: input.val()
            });
        });
        var findHistory = [];
        runtime.command({
            action: 'localData',
            data: 'findHistory'
        }, function(response) {
            findHistory = response.data.findHistory;
        });
        input[0].onkeydown = function(event) {
            if (event.sk_keyName === Mode.specialKeys["<Esc>"]) {
                Front.visualCommand({
                    action: 'visualClear'
                });
                reset();
            } else if (event.keyCode === KeyboardUtils.keyCodes.enter) {
                var query = input.val();
                reset();
                runtime.updateHistory('find', query);
                Front.visualCommand({
                    action: 'visualEnter',
                    query: query
                });
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
        PassThrough.enter();
    };
    return self;
})();
