////////////////////////////////////////////////////////////////////////////////
// dummy functions
function addSearchAliasX(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion, only_this_site_key) {
    addSearchAlias(alias, prompt, search_url, suggestion_url, callback_to_parse_suggestion);
}
////////////////////////////////////////////////////////////////////////////////

function command(cmd, annotation, jscode) {
    if (typeof(jscode) === 'string') {
        jscode = new Function(jscode);
    }
    Commands.items[cmd] = {
        code: jscode,
        annotation: annotation
    };
};

function addSearchAlias(alias, prompt, url, suggestionURL, listSuggestion) {
    SearchEngine.aliases[alias] = {
        prompt: prompt + "≫",
        url: url,
        suggestionURL: suggestionURL,
        listSuggestion: listSuggestion
    };
}

var frontendUI = (function() {
    var self = {
        ports: {}
    };
    self.postMessage = function(to, message) {
        self.ports[to].postMessage(message);
    };
    self.flush = function() {
        self.postMessage('top', {
            frameHeight: getFrameHeight()
        });
    };

    self.omnibar = $('#sk_omnibar').hide();
    self.statusBar = $('#sk_status').hide();
    var frameElement = $("<div class=sk_frame>").appendTo('body').hide();
    var _usage = $('<div id=sk_usage>').appendTo('body').hide();
    var _tabs = $("<div class=sk_tabs><div class=sk_tabs_fg></div><div class=sk_tabs_bg></div></div>").appendTo('body').hide();
    var banner = $('<div id=sk_banner/>').appendTo('body').hide();
    var _bubble = $("<div class=sk_bubble>").html("<div class=sk_bubble_content></div>").appendTo('body').hide();
    $("<div class=sk_arrow>").html("<div class=sk_arrowdown></div><div class=sk_arrowdown_inner></div>").css('position', 'absolute').css('top', '100%').appendTo(_bubble);
    var keystroke = $('<div id=sk_keystroke/>').appendTo('body');

    var fullDisplays = [self.omnibar, frameElement, _usage, _tabs, banner, _bubble];
    var miniDisplays = [self.statusBar, keystroke];
    function getFrameHeight() {
        for (var i = 0; i < fullDisplays.length; i++) {
            if (fullDisplays[i].is(':visible')) {
                return '100%';
            }
        }
        for (var i = 0; i < miniDisplays.length; i++) {
            if (miniDisplays[i].is(':visible')) {
                return '30px';
            }
        }
        return '0px';
    }
    var _display;

    self.hidePopup = function() {
        if (_display && _display.is(':visible')) {
            _display.hide();
            self.flush();
            _display.onHide && _display.onHide();
        }
    }
    function showPopup(td, args) {
        if (_display && _display.is(':visible')) {
            _display.hide();
            _display.onHide && _display.onHide();
        }
        _display = td;
        _display.show();
        self.flush();
        _display.onShow && _display.onShow(args);
        window.focus();
    }

    runtime.actions['highlightElement'] = function(message) {
        var rect = message.rect;
        frameElement.css('top', rect.top).css('left', rect.left).css('width', rect.width).css('height', rect.height).show();
        self.flush();
        setTimeout(function() {
            frameElement.hide();
            self.flush();
        }, 200);
    };

    _tabs.onShow = function(tabs) {
        var tabs_fg = _tabs.find('div.sk_tabs_fg');
        tabs_fg.html("");
        _tabs.trie = new Trie('', Trie.SORT_NONE);
        var hintLabels = Hints.genLabels(tabs.length);
        var tabstr = "<div class=sk_tab style='max-width: {0}px'>".format(window.innerWidth - 50);
        var items = tabs.forEach(function(t, i) {
            var tab = $(tabstr);
            _tabs.trie.add(hintLabels[i].toLowerCase(), t.id);
            tab.html("<div class=sk_tab_hint>{0}</div><div class=sk_tab_wrap><div class=sk_tab_icon><img src='{1}'></div><div class=sk_tab_title>{2}</div></div>".format(hintLabels[i], t.favIconUrl, htmlEncode(t.title)));
            tab.data('url', t.url);
            tabs_fg.append(tab);
        })
        tabs_fg.find('div.sk_tab').each(function() {
            $(this).css('width', $(this).width() + 10);
            $(this).append($("<div class=sk_tab_url>{0}</div>".format($(this).data('url'))));
        });
        _tabs.find('div.sk_tabs_bg').css('width', window.innerWidth).css('height', window.innerHeight);
    }
    runtime.actions['chooseTab'] = function(message) {
        runtime.command({
            action: 'getTabs'
        }, function(response) {
            if (response.tabs.length > runtime.settings.tabsThreshold) {
                showPopup(self.omnibar, {type: 'Tabs'});
            } else {
                showPopup(_tabs, response.tabs);
            }
        });
    };
    _usage.onShow = function(message) {
        _usage.html(message.content);
        $('#moreHelp').on('click', function() {
            _usage.find('.sk_visualUsage').toggle();
        });
    };
    runtime.actions['showUsage'] = function(message) {
        showPopup(_usage, message);
    };
    runtime.actions['openOmnibar'] = function(message) {
        showPopup(self.omnibar, message);
    };
    runtime.actions['openFinder'] = function(message) {
        Find.open();
    };
    runtime.actions['showBanner'] = function(message) {
        banner.html(message.content).show();
        self.flush();
        banner.finish();
        banner.animate({
            "top": "0"
        }, 300);
        banner.delay(message.linger_time || 1000).animate({
            "top": "-3rem"
        }, 300, function() {
            banner.html("").hide();
            self.flush();
        });
    };
    runtime.actions['showBubble'] = function(message) {
        var pos = message.position;
        _bubble.find('div.sk_bubble_content').html(message.content);
        _bubble.show();
        self.flush();
        var w = _bubble.width(),
            h = _bubble.height();
        var left = [pos.left - w / 2, w / 2];
        if (left[0] < 0) {
            left[1] += left[0];
            left[0] = 0;
        } else if ((left[0] + w) > window.innerWidth) {
            left[1] += left[0] - window.innerWidth + w;
            left[0] = window.innerWidth - w;
        }
        _bubble.find('div.sk_arrow').css('left', left[1]);
        _bubble.css('top', pos.top - h - 12).css('left', left[0]);
    };
    runtime.actions['hideBubble'] = function(message) {
        _bubble.hide();
        self.flush();
    };
    runtime.actions['showStatus'] = function(message) {
        StatusBar.show(message.position, message.content);
    };

    var clipboard_holder = $('<textarea id=sk_clipboard/>');
    clipboard_holder = clipboard_holder[0];
    runtime.actions['getContentFromClipboard'] = function(message) {
        var result = '';
        document.body.appendChild(clipboard_holder);
        clipboard_holder.value = '';
        clipboard_holder.select();
        if (document.execCommand('paste')) {
            result = clipboard_holder.value;
        }
        clipboard_holder.value = '';
        clipboard_holder.remove();
        return result;
    };
    runtime.actions['writeClipboard'] = function(message) {
        document.body.appendChild(clipboard_holder);
        clipboard_holder.value = message.content;
        clipboard_holder.select();
        document.execCommand('copy');
        clipboard_holder.value = '';
        clipboard_holder.remove();
    };
    runtime.actions['hideKeystroke'] = function(message) {
        keystroke.animate({
            right: "-2rem"
        }, 300, function() {
            keystroke.html("");
            keystroke.hide();
            self.flush();
        });
    };
    runtime.actions['showKeystroke'] = function(message) {
        keystroke.show();
        self.flush();
        if (keystroke.is(':animated')) {
            keystroke.finish()
        }
        var keys = keystroke.html() + message.key;
        keystroke.html(keys);
        if (keystroke.css('right') !== '0') {
            keystroke.animate({
                right: 0
            }, 300);
        }
    };

    self.initPort = function(message) {
        self.ports[message.from] = event.ports[0];
    };

    self.handleMessage = function(event) {
        var _message = event.data;
        if (_message.action) {
            if (self.hasOwnProperty(_message.action)) {
                var ret = self[_message.action](_message) || {};
                ret.id = _message.id;
                if (_message.from && self.ports[_message.from]) {
                    self.ports[_message.from].postMessage(ret);
                }
            }
        }
    };

    self.handleKeyEvent = function(event, key) {
        var handled = false;
        switch (event.keyCode) {
            case KeyboardUtils.keyCodes.ESC:
                handled = self.hidePopup();
                break;
            default:
                if (_tabs.trie) {
                    _tabs.trie = _tabs.trie.find(key);
                    if (!_tabs.trie) {
                        self.hidePopup();
                        _tabs.trie = null;
                    } else if (_tabs.trie.meta.length) {
                        RUNTIME('focusTab', {
                            tab_id: _tabs.trie.meta[0]
                        });
                        self.hidePopup();
                        _tabs.trie = null;
                    }
                    handled = true;
                }
                break;
        }
        return handled;
    };

    Events.keydownHandlers.unshift(self);
    delete Events.focusHandlers.getBackFocusOnLoad;
    return self;
})();

window.addEventListener('message', function(event) {
    frontendUI.handleMessage(event);
}, true);
