$(document).on("surfingkeys:connected", function() {
    $('#mappings').val(settings.snippets);
    $('#mappings').height($(window).height() - $('#save_container').height() * 3);
});

$('#reset_button').click(function() {
    $.get(chrome.extension.getURL('/pages/default.js'), function(data) {
        $('#mappings').val(data);
    });
    Normal.popup('Settings reset', 300);
});

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
                snippets: $('#mappings').val()
            }
        });
        Normal.popup('Settings saved', 300);
    } catch (e) {
        Normal.popup(e.toString(), 3000);
    }
});
