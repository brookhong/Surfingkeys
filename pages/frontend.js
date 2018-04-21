Normal.enter();

function command(cmd, annotation, jscode) {
    var cmd_code = {
        code: jscode
    };
    var ag = _parseAnnotation({annotation: annotation, feature_group: 14});
    cmd_code.feature_group = ag.feature_group;
    cmd_code.annotation = ag.annotation;
    Commands.items[cmd] = cmd_code;
}

command('setProxy', 'setProxy <proxy_host>:<proxy_port> [proxy_type|PROXY]', function(args) {
    // args is an array of arguments
    var proxy = ((args.length > 1) ? args[1] : "PROXY") + " " + args[0];
    RUNTIME('updateProxy', {
        proxy: proxy
    });
    return true;
});

command('setProxyMode', 'setProxyMode <always|direct|byhost|system|clear>', function(args) {
    runtime.command({
        action: "updateProxy",
        mode: args[0]
    }, function(rs) {
        if (["byhost", "always"].indexOf(rs.proxyMode) !== -1) {
            Front.showBanner("{0}: {1}".format(rs.proxyMode, rs.proxy), 3000);
        } else {
            Front.showBanner(rs.proxyMode, 3000);
        }
    });
    // return true to close Omnibar for Commands, false to keep Omnibar on
    return true;
});

command('listVoices', 'list tts voices', function() {
    runtime.command({
        action: 'getVoices'
    }, function(response) {

        var voices = response.voices.map(function(s) {
            return `<tr><td>${s.voiceName}</td><td>${s.lang}</td><td>${s.gender}</td><td>${s.remote}</td></tr>`;
        });
        voices.unshift("<tr style='font-weight: bold;'><td>voiceName</td><td>lang</td><td>gender</td><td>remote</td></tr>");
        Front.showPopup("<table style='width:100%'>{0}</table>".format(voices.join('')));

    });
});
command('testVoices', 'testVoices <locale> <text>', function(args) {
    runtime.command({
        action: 'getVoices'
    }, function(response) {

        var voices = response.voices, i = 0;
        if (args.length > 0) {
            voices = voices.filter(function(v) {
                return v.lang.indexOf(args[0]) !== -1;
            });
        }
        var textToRead = "This is to test voice with SurfingKeys";
        if (args.length > 1) {
            textToRead = args[1];
        }
        var text;
        for (i = 0; i < voices.length - 1; i++) {
            text = `${textToRead}, ${voices[i].voiceName} / ${voices[i].lang}.`;
            readText(text, {
                enqueue: true,
                verbose: true,
                voiceName: voices[i].voiceName
            });
        }
        text = `${textToRead}, ${voices[i].voiceName} / ${voices[i].lang}.`;
        readText(text, {
            enqueue: true,
            verbose: true,
            voiceName: voices[i].voiceName,
            onEnd: function() {
                Front.showPopup("All voices test done.");
            }
        });
    });
});
command('stopReading', '#13Stop reading.', function(args) {
    RUNTIME('stopReading');
});
command('feedkeys', 'feed mapkeys', function(args) {
    Normal.feedkeys(args[0]);
});
command('quit', '#5quit chrome', function() {
    RUNTIME('quit');
});
command('clearHistory', 'clearHistory <find|cmd|...>', function(args) {
    runtime.updateHistory(args[0], []);
});
command('listSession', 'list session', function() {
    if (Front.omnibar.style.display === "none") {
        Front.openOmnibar({ type: "Commands" });
    }
    runtime.command({
        action: 'getSettings',
        key: 'sessions'
    }, function(response) {
        Omnibar.listResults(Object.keys(response.settings.sessions), function(s) {
            return createElement(`<li>${s}</li>`);
        });
    });
});
command('createSession', 'createSession [name]', function(args) {
    RUNTIME('createSession', {
        name: args[0]
    });
});
command('deleteSession', 'deleteSession [name]', function(args) {
    RUNTIME('deleteSession', {
        name: args[0]
    });
    return true; // to close omnibar after the command executed.
});
command('openSession', 'openSession [name]', function(args) {
    RUNTIME('openSession', {
        name: args[0]
    });
});
command('listQueueURLs', 'list URLs in queue waiting for open', function(args) {
    runtime.command({
        action: 'getQueueURLs'
    }, function(response) {
        Omnibar.listResults(response.queueURLs, function(s) {
            return createElement(`<li>${s}</li>`);
        });
    });
});
command('timeStamp', 'print time stamp in human readable format', function(args) {
    var dt = new Date(parseInt(args[0]));
    Omnibar.listWords([dt.toString()]);
});
