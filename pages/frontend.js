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
