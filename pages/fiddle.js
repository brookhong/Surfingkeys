var source = "";

Front.getContentFromClipboard(function(response) {
    $("div.content").html(response.data);
});
