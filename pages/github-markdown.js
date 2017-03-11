var markdown_code = "";

function previewMarkdown(mk) {
    markdown_code = mk;
    if (runtime.conf.useLocalMarkdownAPI) {
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
    Front.getContentFromClipboard(function(response) {
        previewMarkdown(response.data);
    });
});

mapkey('sm', 'Edit markdown source', function() {
    Front.showEditor(markdown_code, previewMarkdown, 'markdown');
});

mapkey(';h', 'Toggle this section', function() {
    var desc = $('div.description');
    if (desc.is(":visible")) {
        $('div.content').css('height', "100vh");
        desc.hide();
    } else {
        $('div.content').css('height', "90vh");
        desc.show();
    }
});

map('i', 'sm');
