$(document).on('surfingkeys:defaultSettingsLoaded', function() {

    function previewMarkdown(mk) {
        Front.source = mk;
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
        Front.showEditor(Front.source, previewMarkdown, 'markdown');
    });

    mapkey(';s', '#99Switch markdown parser', function() {
        runtime.conf.useLocalMarkdownAPI = !runtime.conf.useLocalMarkdownAPI;
        previewMarkdown(Front.source);
    });

    mapkey('cc', '#99Copy generated html code', function() {
        Front.writeClipboard($('.markdown-body').html());
    });

    Front.renderDataFromClipboard = previewMarkdown;
});
