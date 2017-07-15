var Front = (function() {
    var self = {};
    // The agent is a front stub to talk with pages/frontend.html
    // that will live in all content window except the frontend.html
    // as there is no need to make this object live in frontend.html.

    // this object is stub of UI, it's UI consumer
    self.isProvider = function() {
        return window.location.href.indexOf(chrome.extension.getURL("/pages")) === 0;
    };

    function frontendCommand(args, successById) {
        args.toFrontend = true;
        if (window === top) {
            createFrontEnd();
        }
        runtime.command(args, successById);
    }

    self.highlightElement = function(sn) {
        sn.action = 'highlightElement';
        frontendCommand(sn);
    };

    self.showUsage = function() {
        frontendCommand({
            action: 'showUsage'
        });
    };

    self.showPopup = function(content) {
        frontendCommand({
            action: 'showPopup',
            content: content
        });
    };

    self.hidePopup = function() {
        frontendCommand({
            action: 'hidePopup'
        });
    };


    self.showPressed = function(content) {
        frontendCommand({
            action: 'showPressed'
        });
    };

    var onEditorSaved, elementBehindEditor;
    self.showEditor = function(element, onWrite, type) {
        var content, initial_line = 0;
        if (typeof(element) === "string") {
            content = element;
            elementBehindEditor = document.body;
        } else if (type === 'select') {
            var selected = $(element).val();
            var options = $(element).find('option').map(function(i) {
                if ($(this).val() === selected) {
                    initial_line = i;
                }
                return "{0} >< {1}".format($(this).text(), $(this).val());
            }).toArray();
            content = options.join('\n');
            elementBehindEditor = element;
        } else {
            content = $(element).val();
            elementBehindEditor = element;
        }
        onEditorSaved = onWrite;
        frontendCommand({
            action: 'showEditor',
            type: type || "textarea",
            initial_line: initial_line,
            content: content
        });
    };

    self.chooseTab = function() {
        frontendCommand({
            action: 'chooseTab'
        });
    };

    self.openOmnibar = function(args) {
        args.action = 'openOmnibar';
        frontendCommand(args);
    };

    var onOmniQuery;
    self.openOmniquery = function(args) {
        onOmniQuery = function(query) {
            httpRequest({
                'url': (typeof(args.url) === "function") ? args.url(query) : args.url + query
            }, function(res) {
                var words = args.parseResult(res);

                frontendCommand({
                    action: 'updateOmnibarResult',
                    words: words
                });
            });
        };
        self.openOmnibar(({type: "OmniQuery", extra: args.query, style: args.style}))
    };

    self.openFinder = function() {
        frontendCommand({
            action: "openFinder"
        });
    };

    self.showBanner = function(msg, linger_time) {
        frontendCommand({
            action: "showBanner",
            content: msg,
            linger_time: linger_time
        });
    };

    self.showBubble = function(pos, msg) {
        frontendCommand({
            action: "showBubble",
            content: msg,
            position: pos
        });
    };

    self.hideBubble = function() {
        frontendCommand({
            action: 'hideBubble'
        });
    };

    self.getContentFromClipboard = function(onReady) {
        frontendCommand({
            action: 'getContentFromClipboard'
        }, function(response) {
            // get focus back from frontend for this action, as focus is stolen by the clipboard_holder.
            window.focus();
            onReady(response);
        });
    };

    self.writeClipboard = function(text) {
        frontendCommand({
            action: 'writeClipboard',
            content: text
        }, function(response) {
            // get focus back from frontend for this action, as focus is stolen by the clipboard_holder.
            window.focus();
            Front.showBanner("Copied: " + text);
        });
    };

    self.hideKeystroke = function() {
        frontendCommand({
            action: 'hideKeystroke'
        });
    };

    self.showKeystroke = function(key, mode) {
        frontendCommand({
            action: 'showKeystroke',
            mode: mode,
            key: key
        });
    };

    self.showStatus = function (pos, msg, duration) {
        // don't createFrontEnd for showStatus, test on issues.xxxxxx.com
        runtime.command({
            action: "showStatus",
            content: msg,
            duration: duration,
            toFrontend: true,
            position: pos
        });
    };
    self.toggleStatus = function () {
        runtime.command({
            action: "toggleStatus",
            toFrontend: true
        });
    };

    runtime.on('ace_editor_saved', function(response) {
        if (response.data !== undefined) {
            onEditorSaved(response.data);
        }
        if (runtime.conf.focusOnSaved && isEditable(elementBehindEditor)) {
            elementBehindEditor.focus();
            window.focus();
            Insert.enter();
        }
    });

    runtime.on('omnibar_query_entered', function(response) {
        readText(response.query);
        runtime.updateHistory('OmniQuery', response.query);
        onOmniQuery(response.query);
    });

    runtime.on('getBackFocus', function(response) {
        window.focus();
    });

    runtime.on('getPageText', function(response) {
        return document.body.innerText;
    });

    runtime.runtime_handlers['focusFrame'] = function(msg, sender, response) {
        if (msg.frameId === window.frameId) {
            window.focus();
            document.body.scrollIntoViewIfNeeded();
            var rc = (window.frameElement || document.body).getBoundingClientRect();
            self.highlightElement({
                duration: 500,
                rect: {
                    top: rc.top,
                    left: rc.left,
                    width: rc.width,
                    height: rc.height
                }
            });

            Normal.exit();
            Normal.enter();
            GetBackFocus.enter(0, true);
        }
    };

    return self;
})();
