var $ = (function($) {

    $.htmlEncode = function (str) {
        return $('<div/>').text(str).html();
    };

    $.htmlDecode = function (str) {
        return $('<div/>').html(str).text();
    };

    $.hasScroll = function (el, direction, barSize) {
        var offset = (direction === 'y') ? ['scrollTop', 'height'] : ['scrollLeft', 'width'];
        var result = el[offset[0]];

        if (result < barSize) {
            // set scroll offset to barSize, and verify if we can get scroll offset as barSize
            var originOffset = el[offset[0]];
            el[offset[0]] = el.getBoundingClientRect()[offset[1]];
            result = el[offset[0]];
            el[offset[0]] = originOffset;
        }
        return result >= barSize;
    };

    $.fn.regex = function(pattern, fn, fn_a) {
        var fn = fn || $.fn.text;
        return this.filter(function() {
            return pattern.test(fn.apply($(this), fn_a));
        });
    };
    $.expr[':'].css = function(elem, pos, match) {
        var sel = match[3].split('=');
        return $(elem).css(sel[0]) == sel[1];
    };
    $.fn.topInView = function() {
        return this.filter(function() {
            return $(this).width() * $(this).height() > 0 && $(this).offset().top > (document.scrollingElement || document.body).scrollTop;
        });
    };

    $.fn.filterInvisible = function() {
        return this.filter(function(i) {
            var ret = null;
            var elm = this;
            var style = getComputedStyle(elm);
            if ($(elm).attr('disabled') === undefined && style.visibility !== "hidden") {
                var r = elm.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) {
                    // use the first visible child instead
                    var children = $(elm).find('*').filter(function(j) {
                        var r = this.getBoundingClientRect();
                        return (r.width > 0 && r.height > 0);
                    });
                    if (children.length) {
                        elm = children[0];
                    }
                }
                if (isElementPartiallyInViewport(elm)) {
                    ret = elm;
                }
            }
            return ret !== null;
        });
    };

    return $;
})(jQuery);
