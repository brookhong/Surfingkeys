var disableAll = document.getElementById('disableAll'),
    version = "Surfingkeys " + chrome.runtime.getManifest().version;

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
