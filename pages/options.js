var defaultMappingsEditor = ace.edit("defaultMappings");
defaultMappingsEditor.setTheme("ace/theme/chrome");
defaultMappingsEditor.setKeyboardHandler('ace/keyboard/vim');
defaultMappingsEditor.getSession().setMode("ace/mode/javascript");
$(defaultMappingsEditor.container).hide();
defaultMappingsEditor.setReadOnly(true);
defaultMappingsEditor.container.style.background="#f1f1f1";

var mappingsEditor = ace.edit("mappings");
mappingsEditor.setTheme("ace/theme/chrome");
mappingsEditor.setKeyboardHandler('ace/keyboard/vim');
mappingsEditor.getSession().setMode("ace/mode/javascript");
mappingsEditor.setValue("// an example to create a new mapping `ctrl-y`\nmapkey('c-y', 'Show me the money', function() {\n    alert('a well-known phrase uttered by characters in the 1996 film Jerry Maguire');\n});\n\n// an example to replace `u` with `?`, click `Default mappings` to see how `u` works.\nmap('?', 'u');\n\n// an example to remove mapkey `c-i`\nunmap('c-i');\n\n// click `Save` button to make above settings to take effect.", -1);
mappingsEditor.commands.addCommand({
    name: 'myCommand',
    bindKey: {win: 'Tab',  mac: 'Tab'},
    exec: function(editor) {
    },
    readOnly: false
});

setTimeout(function() {
    mappingsEditor.state.cm.on('vim-mode-change', function(data) {
        if (data.mode === "normal") {
            Events.includeNode(mappingsEditor.container);
        } else {
            Events.excludeNode(mappingsEditor.container);
        }
    });
    var VimApi = require("ace/keyboard/vim").CodeMirror.Vim
    VimApi.defineEx("write", "w", function(cm, input) {
        saveSettings();
    });
}, 100);


function renderSettings() {
    if (runtime.settings.snippets.length) {
        mappingsEditor.setValue(runtime.settings.snippets, -1);
    }
    $('#storage').val(runtime.settings.storage);
    $('#localPath').val(runtime.settings.localPath);
    var h = $(window).height() - $('#save_container').outerHeight() * 4;
    $(mappingsEditor.container).css('width', '100%').css('height', h);
    $(defaultMappingsEditor.container).css('height', h);
}
renderSettings();
var old_handler = runtime.actions['settingsUpdated'];
runtime.actions['settingsUpdated'] = function(resp) {
    old_handler(resp);
    renderSettings();
};

$('#storage').change(function() {
    var storage = $(this).val();
    RUNTIME("changeSettingsStorage", {
        storage: storage
    });
});

$('#reset_button').click(function() {
    RUNTIME("resetSettings", {
        useDefault: true
    });
    Normal.showBanner('Settings reset', 300);
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
            $(mappingsEditor.container).css('width', '50%');
        });
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
