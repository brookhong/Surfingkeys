var settings = {};
function runScript(snippets) {
    var result = { settings: settings, error: "" };
    settings.map = {};
    settings.unmapAllExcept = {};
    try {
        var F = new Function('settings', snippets);
        F(result.settings);
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function map(a, b) {
    var f = false;
    for (var k in settings.map) {
        if (settings.map[k] === b) {
            settings.map[k] = a;
            f = true;
        }
    }
    if (!f) {
        settings.map[b] = a;
    }
}
function unmap(a) {
    settings.map[a] = "";
}
function unmapAllExcept(a, b) {
    settings.unmapAllExcept[b] = a;
}

window.addEventListener('message', function(event) {
    var command = event.data.action;
    switch(command) {
        case 'evalInSandbox':
            event.source.postMessage({
                id: event.data.id,
                action: "resultInSandbox",
                result: runScript(event.data.code)
            }, event.origin);
            break;
        default:
            break;
    }
});
