function renderSettings() {
    if (settings.snippets.length) {
        $('#mappings').val(settings.snippets);
    }
    $('#storage').val(settings.storage);
    $('#localPath').val(settings.localPath);
    var h = $(window).height() - $('#save_container').outerHeight() * 4;
    $('#defaultMappings').height(h);
    $('#mappings').height(h);
    $('#mappings').css('width', '100%');
}
$(document).on("surfingkeys:connected", function() {
    renderSettings();
    var old_handler = port_handlers['settingsUpdated'];
    port_handlers['settingsUpdated'] = function(resp) {
        old_handler(resp);
        renderSettings();
    };
});

$('#storage').change(function(){
    var storage = $(this).val();
    RUNTIME("changeSettingsStorage", {storage: storage});
});

$('#reset_button').click(function() {
    RUNTIME("resetSettings", {useDefault: true});
    Normal.popup('Settings reset', 300);
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
    try {
        if (localPath.length && localPath !== settings.localPath) {
            RUNTIME("loadSettingsFromUrl", {url: localPath});
            Normal.popup('Loading settings from ' + localPath, 300);
        } else {
            RUNTIME('updateSettings', {
                settings: {
                    snippets: $('#mappings').val(),
                    localPath: getURIPath($('#localPath').val())
                }
            });
            Normal.popup('Settings saved', 300);
        }
    } catch (e) {
        Normal.popup(e.toString(), 3000);
    }
});
