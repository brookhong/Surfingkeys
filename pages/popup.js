var disableAll = document.getElementById('disableAll'),
    version = "Surfingkeys " + chrome.runtime.getManifest().version;

function updateStatus(blacklist) {
    var disabled = blacklist.hasOwnProperty('.*');
    disableAll.textContent = (disabled ? 'Enable ' : 'Disable ') + version;
    RUNTIME('setSurfingkeysIcon', {
        status: disabled
    });
}

RUNTIME('getSettings', {
    key: 'blacklist'
}, function(response) {
    updateStatus(response.settings.blacklist);
});

disableAll.addEventListener('click', function() {
    RUNTIME('toggleBlacklist', {
        domain: ".*"
    }, function(response) {
        updateStatus(response.blacklist);
    });
});

document.getElementById('reportIssue').addEventListener('click', function () {
    window.close();
    var description = "%23%23+Error+details%0A%0A{0}%0A%0ASurfingKeys%3A+{1}%0A%0ABrowser%3A+{2}%0A%0AURL%3A+{3}%0A%0A%23%23+Context%0A%0A%2A%2APlease+replace+this+with+a+description+of+how+you+were+using+SurfingKeys.%2A%2A".format(encodeURIComponent(""), chrome.runtime.getManifest().version, encodeURIComponent(navigator.userAgent), encodeURIComponent("<The_URL_Where_You_Find_The_Issue>"));
    window.open("https://github.com/brookhong/Surfingkeys/issues/new?title={0}&body={1}".format(encodeURIComponent(""), description));
});
