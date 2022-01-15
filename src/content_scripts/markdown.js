import { runtime } from './common/runtime.js';
import KeyboardUtils from './common/keyboardUtils';
import {
    createElementWithContent,
    htmlEncode,
    httpRequest,
    setSanitizedContent,
    showBanner,
} from './common/utils.js';
import { marked } from 'marked';

document.addEventListener("surfingkeys:defaultSettingsLoaded", function(evt) {
    const { normal, api } = evt.detail;
    const {
        mapkey,
        Clipboard,
        Front,
    } = api;

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

    function renderHeaderDescription() {
        var words = normal.mappings.getWords().map(function(w) {
            var meta = normal.mappings.find(w).meta;
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
        desc = createElementWithContent('div', words.join(""), {class: "description"});
        document.body.insertBefore(desc, content);
        content.style.height = (window.innerHeight - desc.offsetHeight) + "px";
    }

    var markdownBody = document.querySelector(".markdown-body"), _source;

    function previewMarkdown(mk) {
        _source = mk;
        if (runtime.conf.useLocalMarkdownAPI) {
            setSanitizedContent(markdownBody, marked.parse(mk));
        } else {
            setSanitizedContent(markdownBody, "Loading preview…");
            httpRequest({
                url: "https://api.github.com/markdown/raw",
                data: mk
            }, function(res) {
                setSanitizedContent(markdownBody, res.text);
            });
        }
    }

    mapkey('sm', '#99Edit markdown source', function() {
        Front.showEditor(_source, previewMarkdown, 'markdown');
    });

    mapkey(';s', '#99Switch markdown parser', function() {
        runtime.conf.useLocalMarkdownAPI = !runtime.conf.useLocalMarkdownAPI;
        previewMarkdown(_source);
    });

    mapkey('cc', '#99Copy generated html code', function() {
        Clipboard.write(markdownBody.innerHTML);
    });

    var mdUrl = window.location.search.substr(3);

    if (mdUrl !== "") {
        httpRequest({
            url: mdUrl
        }, function(res) {
            previewMarkdown(res.text);
        });
    } else {
        Clipboard.read(function(response) {
            previewMarkdown(response.data);
        });
    }

    var reader = new FileReader(), inputFile;
    reader.onload = function(){
        previewMarkdown(reader.result);
    };
    function previewMarkdownFile() {
        reader.readAsText(inputFile);
    }
    var inputFileDiv = document.querySelector("input[type=file]");
    inputFileDiv.onchange = function(evt) {
        inputFile = evt.target.files[0];
        previewMarkdownFile();
    };

    mapkey('of', '#99Open local file.', function() {
        inputFileDiv.click();
    });

    renderHeaderDescription();
});
