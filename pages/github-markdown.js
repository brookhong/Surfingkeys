var markdown_code = "", useLocalMarkdownAPI = true;

function previewMarkdown(mk) {
    markdown_code = mk;
    if (useLocalMarkdownAPI) {
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

runtime.command({
    action: 'getSettings',
    key: 'useLocalMarkdownAPI'
}, function(response) {
    useLocalMarkdownAPI = response.settings.useLocalMarkdownAPI;
});

$(document).on('surfingkeys:frontendReady', function(e) {
    Front.getContentFromClipboard(function(response) {
        previewMarkdown(response.data);
    });
});

mapkey('sm', 'Edit markdown source', function() {
    Front.showEditor(markdown_code, previewMarkdown, 'markdown');
});
