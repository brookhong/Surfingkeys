import {
    createElementWithContent,
    showBanner,
    showPopup,
} from '../common/utils.js';
import { RUNTIME } from '../common/runtime.js';

export default (normal, command, omnibar) => {
    command('setProxy', 'setProxy <proxy_host>:<proxy_port> [proxy_type|PROXY]', function(args) {
        // args is an array of arguments
        var proxy = ((args.length > 1) ? args[1] : "PROXY") + " " + args[0];
        RUNTIME('updateProxy', {
            proxy: proxy
        });
        return true;
    });

    command('setProxyMode', 'setProxyMode <always|direct|byhost|system|clear>', function(args) {
        RUNTIME("updateProxy", {
            mode: args[0]
        }, function(rs) {
            if (["byhost", "always"].indexOf(rs.proxyMode) !== -1) {
                showBanner("{0}: {1}".format(rs.proxyMode, rs.proxy), 3000);
            } else {
                showBanner(rs.proxyMode, 3000);
            }
        });
        // return true to close Omnibar for Commands, false to keep Omnibar on
        return true;
    });

    command('listVoices', 'list tts voices', function() {
        RUNTIME('getVoices', null, function(response) {

            var voices = response.voices.map(function(s) {
                return `<tr><td>${s.voiceName}</td><td>${s.lang}</td><td>${s.gender}</td><td>${s.remote}</td></tr>`;
            });
            voices.unshift("<tr style='font-weight: bold;'><td>voiceName</td><td>lang</td><td>gender</td><td>remote</td></tr>");
            showPopup("<table style='width:100%'>{0}</table>".format(voices.join('')));
        });
    });
    command('testVoices', 'testVoices <locale> <text>', function(args) {
        RUNTIME('getVoices', null, function(response) {

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
                    showPopup("All voices test done.");
                }
            });
        });
    });
    command('stopReading', '#13Stop reading.', function(args) {
        RUNTIME('stopReading');
    });
    command('feedkeys', 'feed mapkeys', function(args) {
        normal.feedkeys(args[0]);
    });
    command('quit', '#5quit chrome', function() {
        RUNTIME('quit');
    });
    command('clearHistory', 'clearHistory <find|cmd|...>', function(args) {
        let update = {};
        update[args[0]] = [];
        RUNTIME('updateInputHistory', update);
    });
    command('listSession', 'list session', function() {
        RUNTIME('getSettings', {
            key: 'sessions'
        }, function(response) {
            omnibar.listResults(Object.keys(response.settings.sessions), function(s) {
                return createElementWithContent('li', s);
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
        RUNTIME('getQueueURLs', null, function(response) {
            omnibar.listResults(response.queueURLs, function(s) {
                return createElementWithContent('li', s);
            });
        });
    });
    command('clearQueueURLs', 'clear URLs in queue waiting for open', function(args) {
        RUNTIME('clearQueueURLs');
    });
    command('createTabGroup', 'group all tabs by domain: createTabGroup [title] [grey|blue|red|yellow|green|pink|purple|cyan|orange]', function(args) {
        RUNTIME('createTabGroup', {title: args[0], color: args[1]});
    });
    command('timeStamp', 'print time stamp in human readable format', function(args) {
        var dt = new Date(parseInt(args[0]));
        omnibar.listWords([dt.toString()]);
    });
}
