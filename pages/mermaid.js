var source = "";

function drawDiagram(code) {
    source = code;
    $('div.mermaid').removeAttr('data-processed').html(source);
    mermaid.init({noteMargin: 10}, ".mermaid");
}

$(document).on('surfingkeys:frontendReady', function(e) {
    Front.getContentFromClipboard(function(response) {
        drawDiagram(response.data);
    });
});


mapkey('<Ctrl-Alt-d>', 'Edit mermaid source', function() {
    Front.showEditor(source, drawDiagram, 'mermaid');
});

map('i', '<Ctrl-Alt-d>');
