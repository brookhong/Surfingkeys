var disableAll = document.getElementById('disableAll'),
    lnkSettings = document.getElementById('lnkSettings');

function updateStatus(blacklist) {
    var disabled = blacklist.hasOwnProperty('.*');
    disableAll.textContent = disabled ? 'Enable Surfingkeys' : 'Disable Surfingkeys';
    runtime.command({
        action: 'setSurfingkeysIcon',
        status: disabled
    });
}

runtime.command({
    action: 'localData',
    data: 'blacklist'
}, function(response) {
    updateStatus(response.data.blacklist);
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

