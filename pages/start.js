runtime.command({
    action: "getTopSites"
}, function(response) {
    var urls = response.urls.map(function(u) {
        return `<li><a href="${u.url}"><i style="background:url('chrome://favicon/${u.url}') no-repeat"></i>${u.title}</a></li>`;
    });
    $("#topSites>ul").html(urls.join("\n"));
    var source = $('#quickIntroSource').html();
    $('#quickIntro').html(marked(source));

    $('#screen1').show().addClass("fadeIn");

    $('#back').click(function() {
        $('#screen2').removeClass("fadeOut fadeIn").addClass("fadeOut").one('animationend', function() {
            $('#screen2').hide();
            $('#screen1').show().addClass("fadeIn");
        });
    });

    $('#-show-full-list-of-surfingkeys->a').click(function() {
        $('#screen1').removeClass("fadeOut fadeIn").addClass("fadeOut").one('animationend', function() {
            $('#screen1').hide();
            $('#screen2').show().addClass("fadeIn");
        });
    });
});

$(document).on('surfingkeys:userSettingsLoaded', function() {
    Front.getUsage(function(usage) {
        $('#sk_usage').html(usage);
        var keys = $('#sk_usage').find('div:has(>.kbd-span)').toArray();
        setInterval(function() {
            var i = Math.floor(Math.random()*100000%keys.length);
            $('#randomTip').removeClass("fadeOut fadeIn").addClass("fadeOut").one('animationend', function() {
                $(this).html(keys[i].innerHTML).addClass("fadeIn");
            });
        }, 5000);
    });
});
