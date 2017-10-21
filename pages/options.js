var defaultMappingsEditor = ace.edit("defaultMappings");
defaultMappingsEditor.setTheme("ace/theme/chrome");
defaultMappingsEditor.setKeyboardHandler('ace/keyboard/vim');
defaultMappingsEditor.getSession().setMode("ace/mode/javascript");
$(defaultMappingsEditor.container).hide();
defaultMappingsEditor.setReadOnly(true);
defaultMappingsEditor.container.style.background="#f1f1f1";
defaultMappingsEditor.$blockScrolling = Infinity;

var mappingsEditor = null;
function createMappingEditor(mode, elmId) {
    var self = ace.edit(elmId);
    self = $.extend(self, mode);
    self = $.extend(self, {name: "mappingsEditor", eventListeners: {}, mode: 'normal'});

    self.addEventListener('keydown', function(event) {
        event.sk_suppressed = true;
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)
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
        cm.constructor.Vim.defineEx("quit", "q", function(cm, input) {
            window.close();
        });
    });
    self.getSession().setMode("ace/mode/javascript");
    self.$blockScrolling = Infinity;

    return self;
}

var localPathSaved = "";
function renderSettings(rs) {
    $('#localPath').val(rs.localPath);
    localPathSaved = rs.localPath;
    var h = $(window).height() - $('#save_container').outerHeight() * 4;
    $(mappingsEditor.container).css('height', h);
    $(defaultMappingsEditor.container).css('height', h);
    if (rs.snippets && rs.snippets.length) {
        mappingsEditor.setValue(rs.snippets, -1);
    } else {
        mappingsEditor.setValue($('#sample').html());
    }
}

runtime.on('settingsUpdated', function(resp) {
    if ('snippets' in resp.settings) {
        if (resp.settings.snippets.length) {
            mappingsEditor.setValue(resp.settings.snippets, -1);
        } else {
            mappingsEditor.setValue($('#sample').html());
        }
    }
});

runtime.command({
    action: 'getSettings'
}, function(response) {
    mappingsEditor = createMappingEditor(Mode, 'mappings');
    renderSettings(response.settings);
    if ('error' in response.settings) {
        Front.showBanner(response.settings.error, 5000);
    }
});

$('#reset_button').click(function() {
    runtime.command({
        action: "resetSettings"
    }, function(response) {
        renderSettings(response.settings);
        Front.showBanner('Settings reset', 300);
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
        httpRequest({
            url: chrome.extension.getURL('/pages/default.js'),
        }, function(res) {
            $(defaultMappingsEditor.container).css('display', 'inline-block');
            defaultMappingsEditor.setValue(res.text, -1);
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
    if (localPath.length && localPath !== localPathSaved) {
        RUNTIME("loadSettingsFromUrl", {
            url: localPath
        });
        Front.showBanner('Loading settings from ' + localPath, 300);
    } else {
        var delta = runScript(settingsCode);
        if (delta.error === "") {

            RUNTIME('updateSettings', {
                settings: {
                    snippets: settingsCode,
                    localPath: getURIPath($('#localPath').val())
                }
            });

            Front.showBanner('Settings saved', 300);
        } else {
            Front.showBanner(delta.error, 9000);
        }
    }
}
$('#save_button').click(saveSettings);
