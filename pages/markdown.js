var markdown_code = "";

function previewMarkdown(mk) {
    markdown_code = mk;
    if (runtime.conf.useLocalMarkdownAPI) {
        $('.markdown-body').html(marked(mk));
    } else {
        $('.markdown-body').html("Loading preview…");
        httpRequest({
            url: "https://api.github.com/markdown/raw",
            data: mk
        }, function(res) {
            $('.markdown-body').html(res.text);
        });
    }
}

mapkey('sm', '#99Edit markdown source', function() {
    Front.showEditor(markdown_code, previewMarkdown, 'markdown');
});

mapkey(';s', '#99Switch markdown parser', function() {
    runtime.conf.useLocalMarkdownAPI = !runtime.conf.useLocalMarkdownAPI;
    previewMarkdown(markdown_code);
});

var renderDataFromClipboard = previewMarkdown;
