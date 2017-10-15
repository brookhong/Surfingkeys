$(document).on('surfingkeys:defaultSettingsLoaded', function() {

    mermaid.initialize({
        startOnLoad: false
    });

    var sequenceDiagramExample = `sequenceDiagram
    Normal->>runtime: command

    runtime->>background: getCaptureSize

    runtime->>Normal: onResponse

    Normal->>Normal: initialize
    Normal->>canvas: createCanvas
    Normal->>img: createImage

    loop captureScrollingElement

        Normal->>runtime: command

        runtime->>background: captureVisibleTab

        runtime->>Normal: setImgSrc

        Normal->>img: setSrc

        img->>img: onload

        img->>canvas: drawImage

        alt lastScrollTop === elm.scrollTop
            alt lastScrollLeft === elm.scrollLeft
                Normal->>Front: showImage
            else
                Normal->>Normal: pan to left
            end
        else
            Normal->>Normal: pan to down
        end
    end`;

    var flowChartExample = `graph LR
    A[Hard edge] -->|Link text| B(Round edge)
    B --> C{Decision}
    C -->|One| D[Result one]
    C -->|Two| E[Result two]`;

    mermaid.parseError = function(err) {
        Front.showPopup(err);
    };
    function drawDiagram(code) {
        Front.source = code;
        $('div.mermaid').removeAttr('data-processed').html(code);
        mermaid.init({noteMargin: 10}, ".mermaid");
    }

    mapkey('<Ctrl-Alt-d>', '#99Edit mermaid source', function() {
        Front.showEditor(Front.source, drawDiagram, 'mermaid');
    });

    mapkey(';f', '#99Load flowchart example', function() {
        drawDiagram(flowChartExample);
    });

    mapkey(';s', '#99Load flowchart example', function() {
        drawDiagram(sequenceDiagramExample);
    });

    map('i', '<Ctrl-Alt-d>');

    mapkey('yy', '#99Generate image', function() {
        var content = $('div.content')[0];
        if (Utils.hasScroll(content, 'y', 16) || Utils.hasScroll(content, 'x', 16)) {
            Normal.captureElement(content);
        } else {
            Normal.captureElement($('div.content>div.mermaid')[0]);
        }
    });

    unmap('f');
    mapkey('fh', '#99Set handwriting font', function() {
        $('div.mermaid').css('font-family', 'danielbd');
    });

    mapkey('fn', '#99Set normal font', function() {
        $('div.mermaid').css('font-family', $('body').css('font-family'));
    });

    Front.renderDataFromClipboard = drawDiagram;
});
