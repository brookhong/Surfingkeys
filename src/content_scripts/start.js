import { RUNTIME } from './common/runtime.js';
import {
    setSanitizedContent,
} from './common/utils.js';
import { marked } from 'marked';

RUNTIME("getTopSites", null, function(response) {
    var urls = response.urls.map(function(u) {
        const favUrl = chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(u.url)}`);
        return `<li><a href="${u.url}"><i style="background:url(${favUrl}) no-repeat"></i>${u.title}</a></li>`;
    });
    setSanitizedContent(document.querySelector("#topSites>ul"), urls.join("\n"));
    var source = document.getElementById('quickIntroSource').innerHTML;
    setSanitizedContent(document.querySelector('#quickIntro'), marked.parse(source));

    var screen1 = document.querySelector("#screen1");
    screen1.show();
    screen1.classList.add("fadeIn");

    var screen2 = document.querySelector("#screen2");

    document.getElementById('back').onclick = function() {
        var cl = screen2.classList;
        cl.remove("fadeOut");
        cl.remove("fadeIn");
        cl.add("fadeOut");
        screen2.one('animationend', function() {
            screen2.hide();
            screen1.show();
            screen1.classList.add("fadeIn");
        });
    };

    document.querySelector('#show-full-list-of-surfingkeys>a').onclick = function() {
        var cl = screen1.classList;
        cl.remove("fadeOut");
        cl.remove("fadeIn");
        cl.add("fadeOut");
        screen1.one('animationend', function() {
            screen1.hide();
            screen2.show();
            screen2.classList.add("fadeIn");
        });
    };
});

document.addEventListener("surfingkeys:userSettingsLoaded", function(evt) {
    const { getUsage } = evt.detail;
    getUsage(function(usage) {
        var _usage = document.getElementById('sk_usage');
        setSanitizedContent(_usage, usage);
        var keys = Array.from(_usage.querySelectorAll('div')).filter(function(d) {
            return d.firstElementChild.matches(".kbd-span");
        });
        var randomTip = document.getElementById("randomTip");
        setInterval(function() {
            var i = Math.floor(Math.random()*100000%keys.length);
            var cl = randomTip.classList;
            cl.remove("fadeOut");
            cl.remove("fadeIn");
            cl.add("fadeOut");
            randomTip.one('animationend', function() {
                setSanitizedContent(this, keys[i].innerHTML);
                this.classList.add("fadeIn");
            });
        }, 5000);
    });
});
