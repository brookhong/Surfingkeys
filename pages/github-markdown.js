var markdown_code = "";

function previewMarkdown(mk) {
    markdown_code = mk;
    if (runtime.settings.useLocalMarkdownAPI) {
        $('.markdown-body').html(marked(mk));
    } else {
        httpRequest({
            url: "https://api.github.com/markdown/raw",
            data: mk
        }, function(res) {
            $('.markdown-body').html(res.text);
        });
    }
}

$(document).on('surfingkeys:frontendReady', function(e) {
    Normal.getContentFromClipboard(function(response) {
        previewMarkdown(response.data);
    });
});

mapkey('sm', 'Edit markdown source', function() {
    Normal.showEditor(markdown_code, previewMarkdown, 'markdown');
});
