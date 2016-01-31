runtime.command({
    action: 'getTabErrors'
}, function(response) {
    if (!response.tabError) {
        window.location.href = chrome.extension.getURL("pages/options.html");
    }
    console.log(response);
    var tabError = response.tabError[0];
    $('#main-message .error-code').html(tabError.error);
    var a = $('#main-message a');
    a.html(tabError.url);
    a.attr('href', tabError.url);
    var url = new URL(tabError.url);
    $('#errorHost').html(url.host);
    var wrapper = $('div.interstitial-wrapper');
    var margin = "15% calc(50% - {0}px)".format(wrapper.width() / 2);
    wrapper.css('margin', margin);

    mapkey('r', 'reload', function() {
        window.location.href = tabError.url;
    });
    mapkey('a', 'reload', function() {
        RUNTIME('updateProxy', {
            host: url.host,
            operation: 'add'
        });
    });
});
