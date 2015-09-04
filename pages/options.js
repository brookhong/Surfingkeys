port.handlers['settings'] = function(msg) {
    $('#mappings').val(msg.settings);
};
port.postMessage({
    'action': 'getSettings'
});

window.setTimeout(function() {
    $('#mappings').height($(window).height() - $('#save_container').height() * 3);
}, 100);

$('#reset_button').click(function() {
    $.get(chrome.extension.getURL('/pages/default.js'), function(data) {
        $('#mappings').val(data);
    });
    Normal.popup('Settings reset', 300);
});

$('#save_button').click(function() {
    var settingsCode = $('#mappings').val();
    try {
        applySettings(settingsCode);
        chrome.runtime.sendMessage({
            action: 'updateSettings',
            settings: $('#mappings').val()
        });
        Normal.popup('Settings saved', 300);
    } catch (e) {
        Normal.popup(e.toString(), 3000);
    }
});
