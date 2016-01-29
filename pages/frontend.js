var command = function(cmd, annotation, jscode) {
    if (typeof(jscode) === 'string') {
        jscode = new Function(jscode);
    }
    Commands.items[cmd] = {
        code: jscode,
        annotation: annotation
    };
};

var addSearchAlias = function(alias, prompt, url, suggestionURL, listSuggestion) {
    SearchEngine.aliases[alias] = {
        prompt: prompt + "≫",
        url: url,
        suggestionURL: suggestionURL,
        listSuggestion: listSuggestion
    };
}

window.addEventListener('message', function(event) {
    frontendUI.handleMessage(event);
}, true);
