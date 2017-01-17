var source = "";

mermaid.initialize({
    startOnLoad: false
});

mermaid.parseError = function(err) {
    Front.showBanner("Failed to generate diagram from clipboard, load default", 3000);
    drawDiagram($('#sequenceDiagramExample').text());
}
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

mapkey('yy', 'Generate image', function() {
    Normal.captureElement($('div.content')[0]);
});
