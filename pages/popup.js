var disableAll = document.getElementById('disableAll'),
    disableThis = document.getElementById('disableThis'),
    settings = document.getElementById('settings'),
    activeTab = null,
    surfingkeysStatus = {};

function onSurfingkeysStatus(status) {
    surfingkeysStatus = status;
    disableThis.textContent = status.this ? 'Enable Surfingkeys on this domain' : 'Disable Surfingkeys on this domain';
    disableAll.textContent = status.all ? 'Enable Surfingkeys' : 'Disable Surfingkeys';
}

function toggleBlacklist(origin) {
    chrome.tabs.sendMessage(
        activeTab.id, {
            target: 'content_runtime',
            origin: origin,
            subject: 'toggleBlacklist'
        },
        onSurfingkeysStatus);
}

chrome.tabs.query({
    active: true,
    currentWindow: true
}, function(tabs) {
    activeTab = tabs[0];
    chrome.tabs.sendMessage(
        activeTab.id, {
            target: 'content_runtime',
            subject: 'getBlacklist'
        },
        onSurfingkeysStatus);
});

disableAll.addEventListener('click', function() {
    toggleBlacklist('.*');
});

disableThis.addEventListener('click', function() {
    toggleBlacklist(surfingkeysStatus.origin);
});

settings.addEventListener('click', function() {
    chrome.runtime.sendMessage({
        action: 'openLink',
        tab: {
            tabbed: true
        },
        url: chrome.extension.getURL('/pages/options.html'),
        repeats: 1
    });
});
