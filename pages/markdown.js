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
        Clipboard.write($('.markdown-body').html());
    });

    var mdUrl = window.location.search.substr(3);

    if (mdUrl !== "") {
        httpRequest({
            url: mdUrl
        }, function(res) {
            previewMarkdown(res.text);
        });
    } else {
        Front.renderDataFromClipboard = previewMarkdown;
    }

    var reader = new FileReader(), inputFile;
    reader.onload = function(){
        previewMarkdown(reader.result);
    };
    function previewMarkdownFile() {
        reader.readAsText(inputFile);
    }
    $('input[type=file]').on('change', function(evt) {
        if (!inputFile) {
            mapkey('or', '#99Reload from selected local file.', function() {
                previewMarkdownFile();
                Front.showBanner("Reloaded!", 100);
            });
            Front.renderHeaderDescription();
        }
        inputFile = evt.target.files[0];
        previewMarkdownFile();
    });

    mapkey('of', '#99Open local file.', function() {
        $('input[type=file]').click();
    });

});
