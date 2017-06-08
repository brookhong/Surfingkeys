var disableAll = document.getElementById('disableAll'),
    disableCurrent = document.getElementById('disableCurrent'),
    version = "Surfingkeys " + chrome.runtime.getManifest().version,
    lnkSettings = document.getElementById('lnkSettings');

function updateStatus(blacklist, currentDomain) {
    var disabledAll = blacklist.hasOwnProperty('.*');
    disableAll.textContent = (disabledAll ? 'Enable ' : 'Disable ') + version + ' (global)';

    var disabledCurrent = blacklist.hasOwnProperty(currentDomain);
    disableCurrent.textContent = (disabledCurrent ? 'Enable ' : 'Disable ') + version + ' (current)';

    runtime.command({
        action: 'setSurfingkeysIcon',
        status: disabledAll || disabledCurrent
    });
}

usingCurrentDomain(function currentDomainAction(currentDomain) {
    runtime.command({
        action: 'getSettings',
        key: 'blacklist'
    }, function(response) {
        updateStatus(response.settings.blacklist, currentDomain);
    });
});

disableAll.addEventListener('click', function() {
    usingCurrentDomain(function currentDomainAction(currentDomain) {
        runtime.command({
            action: 'toggleBlacklist',
            domain: ".*"
        }, function(response) {
            updateStatus(response.blacklist, currentDomain);
        });
    });
});

disableCurrent.addEventListener('click', function() {
    usingCurrentDomain(function currentDomainAction(currentDomain) {
        runtime.command({
            action: 'toggleBlacklist',
            domain: currentDomain
        }, function(response) {
            updateStatus(response.blacklist, currentDomain);
        });
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

function usingCurrentDomain(callback) {
    chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT},
        function(tabs){
            var url = tabs[0].url;
            var link = document.createElement('a');
            link.href = url;
            var domain = link.protocol + "//" + link.hostname;

            callback(domain);
        }
    );
}

