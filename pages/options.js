$(document).on("surfingkeys:connected", function() {
    $('#mappings').val(settings.snippets);
    $('#storage').val(settings.storage);
    $('#localPath').val(settings.localPath);
    $('#mappings').height($(window).height() - $('#save_container').height() * 3);
    var old_handler = port_handlers['settingsUpdated'];
    port_handlers['settingsUpdated'] = function(resp) {
        old_handler(resp);
        $('#mappings').val(settings.snippets);
        $('#storage').val(settings.storage);
        $('#localPath').val(settings.localPath);
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

function getURIPath(fn) {
    if (fn.indexOf('file:///') === -1) {
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
    var localPath = getURIPath($('#localPath').val());
    try {
        if (localPath !== settings.localPath) {
            RUNTIME("loadSettingsFromUrl", {url: localPath});
            Normal.popup('Loading settings from ' + localPath, 300);
        } else {
            applySettings({
                snippets: settingsCode,
                blacklist: settings.blacklist,
                marks: settings.marks
            });
            Normal.popup('Settings saved', 300);
        }
    } catch (e) {
        Normal.popup(e.toString(), 3000);
    }
});
