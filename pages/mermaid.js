mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    flowchart: {
        curve: "basis"
    }
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

var classDiagramExample = `classDiagram
Class01 <|-- AveryLongClass : Cool
Class03 *-- Class04
Class05 o-- Class06
Class07 .. Class08
Class09 --> C2 : Where am i?
Class09 --* C3
Class09 --|> Class07
Class07 : equals()
Class07 : Object[] elementData
Class01 : size()
Class01 : int chimp
Class01 : int gorilla
Class08 <--> C2: Cool label`;

var mermaidDiv = document.querySelector("div.mermaid");
function drawDiagram(code) {
    Front.source = code;
    mermaidDiv.removeAttribute("data-processed");
    setInnerHTML(mermaidDiv, code);
    try {
        mermaid.init({noteMargin: 10}, ".mermaid");
    } catch (e) {
        Front.showPopup(e.toString());
    }
}

mapkey('<Ctrl-Alt-d>', '#99Edit mermaid source', function() {
    Front.showEditor(Front.source, drawDiagram, 'mermaid');
});

mapkey(';f', '#99Load flowchart example', function() {
    drawDiagram(flowChartExample);
});

mapkey(';s', '#99Load sequenceDiagram example', function() {
    drawDiagram(sequenceDiagramExample);
});

mapkey(';c', '#99Load classDiagram example', function() {
    drawDiagram(classDiagramExample);
});

map('i', '<Ctrl-Alt-d>');

mapkey('yy', '#99Generate image', function() {
    var content = document.querySelector('div.content');
    if (hasScroll(content, 'y', 16) || hasScroll(content, 'x', 16)) {
        Normal.captureElement(content);
    } else {
        Normal.captureElement(mermaidDiv);
    }
});

Front.renderDataFromClipboard = drawDiagram;
