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

runtime.command({
    action: 'getSettings'
}, function(response) {
    var rs = response.settings;
    runtime.conf.useLocalMarkdownAPI = rs.useLocalMarkdownAPI;
    runtime.conf.tabsThreshold = rs.tabsThreshold;
    runtime.conf.omnibarMaxResults = rs.omnibarMaxResults;
});

$(document).on('surfingkeys:themeChanged', function(evt, theme) {
    $('#sk_theme').html(theme);
});
