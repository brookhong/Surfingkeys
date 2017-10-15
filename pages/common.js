$(document).on('surfingkeys:defaultSettingsLoaded', function() {
    var desc, content;

    mapkey(';h', '#99Toggle this section', function() {
        if (desc.is(":visible")) {
            content.css('height', "100vh");
            desc.hide();
        } else {
            desc.show();
            content.css('height', window.innerHeight - desc.outerHeight());
        }
    });

    if (typeof(Front.renderDataFromClipboard) === "function") {
        Front.getContentFromClipboard(function(response) {
            Front.renderDataFromClipboard(response.data);
        });

        var words = Normal.mappings.getWords().map(function(w) {
            var meta = Normal.mappings.find(w).meta;
            w = Utils.decodeKeystroke(w);
            if (meta.annotation && meta.annotation.length && meta.feature_group === 99) {
                return "<div><span class=kbd-span><kbd>{0}</kbd></span><span class=annotation>{1}</span></div>".format(Utils.htmlEncode(w), meta.annotation);
            }
            return null;
        }).filter(function(w) {
            return w !== null;
        });

        content = $('div.content');
        desc = $('<div class="description">').html(words.join("")).insertBefore('div.content');
        content.css('height', window.innerHeight - desc.outerHeight());
    }
});
