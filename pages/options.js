function renderSettings() {
    if (runtime.settings.snippets.length) {
        $('#mappings').val(runtime.settings.snippets);
    }
    $('#storage').val(runtime.settings.storage);
    $('#localPath').val(runtime.settings.localPath);
    var h = $(window).height() - $('#save_container').outerHeight() * 4;
    $('#defaultMappings').height(h);
    $('#mappings').height(h);
    $('#mappings').css('width', '100%');
}
$(document).on("surfingkeys:settingsApplied", function() {
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
    RUNTIME("resetSettings", {
        useDefault: true
    });
    Normal.showBanner('Settings reset', 300);
});

$('.infoPointer').click(function() {
    $('#' + $(this).attr('for')).toggle();
});

$('#showDefaultSettings').click(function() {
    if ($('#defaultMappings').is(':visible')) {
        $('#defaultMappings').hide();
        $('#mappings').css('width', '100%');
    } else {
        $.ajax({
            url: chrome.extension.getURL('/pages/default.js'),
            type: 'GET'
        }).done(function(response) {
            $('#defaultMappings').html(response).css('width', '50%').css('display', 'inline-block');
            $('#mappings').css('width', '50%');
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

$('#save_button').click(function() {
    var settingsCode = $('#mappings').val();
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
});
