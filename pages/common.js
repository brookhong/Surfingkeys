var desc, content;

mapkey(';h', '#99Toggle this section', function() {
    if (desc.style.display !== "none") {
        content.style.height = "100vh";
        desc.style.display = "none";
    } else {
        desc.style.display = "";
        content.style.height = (window.innerHeight - desc.offsetHeight) + "px";
    }
});

if (typeof(Front.renderDataFromClipboard) === "function") {
    Clipboard.read(function(response) {
        Front.renderDataFromClipboard(response.data);
    });
}

Front.renderHeaderDescription = function() {
    var words = Normal.mappings.getWords().map(function(w) {
        var meta = Normal.mappings.find(w).meta;
        w = KeyboardUtils.decodeKeystroke(w);
        if (meta.annotation && meta.annotation.length && meta.feature_group === 99) {
            return `<div><span class=kbd-span><kbd>${htmlEncode(w)}</kbd></span><span class=annotation>${meta.annotation}</span></div>`;
        }
        return null;
    }).filter(function(w) {
        return w !== null;
    });

    desc = document.querySelector('div.description');
    if (desc) {
        desc.remove();
    }
    content = document.querySelector('div.content');
    desc = createElement(`<div class="description">${words.join("")}</div>`);
    document.body.insertBefore(desc, content);
    content.style.height = (window.innerHeight - desc.offsetHeight) + "px";
};
Front.renderHeaderDescription();
