var disableAll = document.getElementById('disableAll'),
    version = "Surfingkeys " + chrome.runtime.getManifest().version,
    lnkSettings = document.getElementById('lnkSettings');

function updateStatus(blacklist) {
    var disabled = blacklist.hasOwnProperty('.*');
    disableAll.textContent = (disabled ? 'Enable ' : 'Disable ') + version;
    runtime.command({
        action: 'setSurfingkeysIcon',
        status: disabled
    });
}

runtime.command({
    action: 'getSettings',
    key: 'blacklist'
}, function(response) {
    updateStatus(response.settings.blacklist);
});

disableAll.addEventListener('click', function() {
    runtime.command({
        action: 'toggleBlacklist',
        domain: ".*"
    }, function(response) {
        updateStatus(response.blacklist);
    });
});

lnkSettings.addEventListener('click', function() {
    chrome.runtime.sendMessage({
        action: 'openLink',
        tab: {
            tabbed: true
        },
        url: chrome.extension.getURL('/pages/options.html')
    });
});

