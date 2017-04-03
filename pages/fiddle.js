var source = "";

$(document).on('surfingkeys:frontendReady', function(e) {
    Front.getContentFromClipboard(function(response) {
        $("div.content").html(response.data);
    });
});
