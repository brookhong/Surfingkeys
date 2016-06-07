runtime.command({
    action: 'getTabErrors'
}, function(response) {
    if (!response.tabError || response.tabError.length === 0) {
        window.location.href = chrome.extension.getURL("pages/options.html");
    } else {
        var tabError = response.tabError[0];
        $('#main-message .error-code').html(tabError.error);
        var a = $('#main-message a');
        a.html(tabError.url);
        a.attr('href', tabError.url);
        var host = tabError.url.replace(/^\w+:\/\/([^\/]+)\/.*$/i, "$1");
        if (/.*\..*\./.test(host)) {
            host = host.replace(/^[^\.]*\./, '');
        }
        $('#errorHost').html(host);
        var wrapper = $('div.interstitial-wrapper');
        var margin = "15% calc(50% - {0}px)".format(wrapper.width() / 2);
        wrapper.css('margin', margin);

        mapkey('r', 'reload', function() {
            window.location.href = tabError.url;
        });
        mapkey('a', 'reload', function() {
            RUNTIME('updateProxy', {
                host: host,
                operation: 'add'
            });
        });
    }
});
