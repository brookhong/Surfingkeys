$(document).on("surfingkeys:connected", function() {
    $('#mappings').val(settings.snippets);
    $('#storage').val(settings.storage);
    $('#localPath').val(settings.localPath);
    $('#mappings').height($(window).height() - $('#save_container').height() * 3);
});

$('#storage').change(function(){
    var storage = $(this).val();
    chrome.runtime.sendMessage({
        action: 'changeSettingsStorage',
        storage: storage
    });
});

$('#reset_button').click(function() {
    $.get(chrome.extension.getURL('/pages/default.js'), function(data) {
        $('#mappings').val(data);
    });
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
    try {
        applySettings({
            snippets: settingsCode,
            blacklist: settings.blacklist,
            marks: settings.marks
        });
        chrome.runtime.sendMessage({
            action: 'updateSettings',
            settings: {
                snippets: $('#mappings').val(),
                localPath: getURIPath($('#localPath').val())
            }
        });
        Normal.popup('Settings saved', 300);
    } catch (e) {
        Normal.popup(e.toString(), 3000);
    }
});
