var Front = (function() {
    var self = {};
    // The agent is a front stub to talk with pages/frontend.html
    // that will live in all content window except the frontend.html
    // as there is no need to make this object live in frontend.html.

    // this object is stub of UI, it's UI consumer
    self.isProvider = function() {
        return false;
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

    self.showKeystroke = function(key) {
        frontendCommand({
            action: 'showKeystroke',
            key: decodeKeystroke(key)
        });
    };

    self.showStatus = function (pos, msg, duration) {
        frontendCommand({
            action: "showStatus",
            content: msg,
            duration: duration,
            position: pos
        });
    }

    runtime.on('ace_editor_saved', function(response) {
        onEditorSaved(response.data);
        if (runtime.conf.focusOnSaved && isEditable(elementBehindEditor)) {
            elementBehindEditor.focus();
            Insert.enter();
        }
    });

    runtime.on('omnibar_query_entered', function(response) {
        runtime.updateHistory('OmniQuery', response.query);
        onOmniQuery(response.query);
    });

    runtime.on('getFocusFromFront', function(response) {
        document.body.focus();
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
            GetBackFocus.enter();
        }
    };

    return self;
})();
