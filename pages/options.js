var defaultMappingsEditor = ace.edit("defaultMappings");
defaultMappingsEditor.setTheme("ace/theme/chrome");
defaultMappingsEditor.setKeyboardHandler('ace/keyboard/vim');
defaultMappingsEditor.getSession().setMode("ace/mode/javascript");
$(defaultMappingsEditor.container).hide();
defaultMappingsEditor.setReadOnly(true);
defaultMappingsEditor.container.style.background="#f1f1f1";
defaultMappingsEditor.$blockScrolling = Infinity;

var mappingsEditor = (function(mode, elmId) {
    var self = ace.edit(elmId);
    self = $.extend(self, mode);
    self = $.extend(self, {name: "mappingsEditor", eventListeners: {}, mode: 'normal'});

    self.addEventListener('keydown', function(event) {
        event.sk_suppressed = true;
        if (event.sk_keyName === Mode.specialKeys["<Esc>"]
            && self.mode === 'normal' // vim in normal mode
            && (self.state.cm.state.vim.status === null || self.state.cm.state.vim.status === "") // and no pending normal operation
        ) {
            document.activeElement.blur();
            self.exit();
        }
    });
    $('#mappings textarea').on('focus', function() {
        setTimeout(function() {
            Hints.exit();
            Insert.exit();
            self.enter();
        }, 10);
    });

    self.setTheme("ace/theme/chrome");
    ace.config.loadModule('ace/ext/language_tools', function (mod) {
        ace.config.loadModule('ace/autocomplete', function (mod) {
            mod.Autocomplete.startCommand.bindKey = "Tab";
            mod.Autocomplete.prototype.commands['Space'] = mod.Autocomplete.prototype.commands['Tab'];
            mod.Autocomplete.prototype.commands['Tab'] = mod.Autocomplete.prototype.commands['Down'];
            mod.Autocomplete.prototype.commands['Shift-Tab'] = mod.Autocomplete.prototype.commands['Up'];
        });
        self.setOptions({
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: false,
            enableSnippets: false
        });
    });
    self.setKeyboardHandler('ace/keyboard/vim', function() {
        var cm = self.state.cm;
        cm.on('vim-mode-change', function(data) {
            self.mode = data.mode;
        });
        cm.constructor.Vim.defineEx("write", "w", function(cm, input) {
            saveSettings();
        });
    });
    self.getSession().setMode("ace/mode/javascript");
    self.$blockScrolling = Infinity;

    self.setExampleValue = function() {
        self.setValue("// an example to create a new mapping `ctrl-y`\nmapkey('<Ctrl-y>', 'Show me the money', function() {\n    Normal.showPopup('a well-known phrase uttered by characters in the 1996 film Jerry Maguire (Escape to close).');\n});\n\n// an example to replace `u` with `?`, click `Default mappings` to see how `u` works.\nmap('?', 'u');\n\n// that's how to map SHIFT + F to double key command\n// map('F', 'af');\n\n// an example to remove mapkey `Ctrl-i`\nunmap('<Ctrl-i>');\n\n// click `Save` button to make above settings to take effect.\n// set theme\nsettings.theme = '\\\n.sk_theme { \\\n    background: #fff; \\\n    color: #000; \\\n} \\\n.sk_theme tbody { \\\n    color: #000; \\\n} \\\n.sk_theme input { \\\n    color: #000; \\\n} \\\n.sk_theme .url { \\\n    color: #555; \\\n} \\\n.sk_theme .annotation { \\\n    color: #555; \\\n} \\\n.sk_theme .focused { \\\n    background: #f0f0f0; \\\n}';\n", -1);
    };

    return self;
})(Mode, 'mappings');

function renderSettings() {
    if (runtime.settings.snippets.length) {
        mappingsEditor.setValue(runtime.settings.snippets, -1);
    } else {
        mappingsEditor.setExampleValue();
    }
    $('#storage').val(runtime.settings.storage);
    $('#localPath').val(runtime.settings.localPath);
    var h = $(window).height() - $('#save_container').outerHeight() * 4;
    $(mappingsEditor.container).css('height', h);
    $(defaultMappingsEditor.container).css('height', h);
}
$.when(settingsDeferred).done(function (settings) {
    renderSettings();
    var old_handler = runtime.actions['settingsUpdated'];
    runtime.actions['settingsUpdated'] = function(resp) {
        old_handler(resp);
        renderSettings();
    };
});

$('#storage').change(function() {
    var storage = $(this).val();
    RUNTIME("changeSettingsStorage", {
        storage: storage
    });
});

$('#reset_button').click(function() {
    runtime.command({
        action: "resetSettings",
        useDefault: true
    }, function(response) {
        runtime.settings = response.settings;
        renderSettings();
        Normal.showBanner('Settings reset', 300);
    });
});

$('.infoPointer').click(function() {
    $('#' + $(this).attr('for')).toggle();
});

$('#showDefaultSettings').click(function() {
    if ($(defaultMappingsEditor.container).is(':visible')) {
        $(defaultMappingsEditor.container).hide();
        $(mappingsEditor.container).css('width', '100%');
    } else {
        $.ajax({
            url: chrome.extension.getURL('/pages/default.js'),
            type: 'GET'
        }).done(function(response) {
            $(defaultMappingsEditor.container).css('display', 'inline-block');
            defaultMappingsEditor.setValue(response, -1);
            $(defaultMappingsEditor.container).css('width', '50%');
        });
        $(mappingsEditor.container).css('width', '50%');
    }
});

function getURIPath(fn) {
    if (fn.length && !/^\w+:\/\/\w+/i.test(fn) && fn.indexOf('file:///') === -1) {
        fn = fn.replace(/\\/g, '/');
        if (fn[0] === '/') {
            fn = fn.substr(1);
        }
        fn = "file:///" + fn;
    }
    return fn;
}
function saveSettings() {
    var settingsCode = mappingsEditor.getValue();
    var localPath = getURIPath($('#localPath').val().trim());
    if (localPath.length && localPath !== runtime.settings.localPath) {
        RUNTIME("loadSettingsFromUrl", {
            url: localPath
        });
        Normal.showBanner('Loading settings from ' + localPath, 300);
    } else {
        try {
            var F = new Function(settingsCode);
            F();
            RUNTIME('updateSettings', {
                settings: {
                    snippets: settingsCode,
                    localPath: getURIPath($('#localPath').val())
                }
            });
            Normal.showBanner('Settings saved', 300);
        } catch (e) {
            Normal.showBanner(e.toString(), 3000);
        }
    }
}
$('#save_button').click(saveSettings);
