function generateQuickGuid() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function htmlEncode(str) {
    return $('<div/>').text(str).html();
}

function htmlDecode(str) {
    return $('<div/>').html(str).text();
}
function isEditable(element) {
    return element.localName === 'input' || element.localName === 'textarea' || element.localName === 'select' || element.isContentEditable;
}

String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{' + i + '\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

String.prototype.trimAround = function() {
  return this.replace(/^(\s+)?(.*\S)?(\s+)?$/g, '$2');
};

String.prototype.validURL = (function() {
  var TLDs = ['abogado', 'ac', 'academy', 'accountants', 'active', 'actor', 'ad', 'adult', 'ae', 'aero', 'af', 'ag', 'agency', 'ai', 'airforce', 'al', 'allfinanz', 'alsace', 'am', 'amsterdam', 'an', 'android', 'ao', 'aq', 'aquarelle', 'ar', 'archi', 'army', 'arpa', 'as', 'asia', 'associates', 'at', 'attorney', 'au', 'auction', 'audio', 'autos', 'aw', 'ax', 'axa', 'az', 'ba', 'band', 'bank', 'bar', 'barclaycard', 'barclays', 'bargains', 'bayern', 'bb', 'bd', 'be', 'beer', 'berlin', 'best', 'bf', 'bg', 'bh', 'bi', 'bid', 'bike', 'bio', 'biz', 'bj', 'black', 'blackfriday', 'bloomberg', 'blue', 'bm', 'bmw', 'bn', 'bnpparibas', 'bo', 'boo', 'boutique', 'br', 'brussels', 'bs', 'bt', 'budapest', 'build', 'builders', 'business', 'buzz', 'bv', 'bw', 'by', 'bz', 'bzh', 'ca', 'cab', 'cal', 'camera', 'camp', 'cancerresearch', 'capetown', 'capital', 'caravan', 'cards', 'care', 'career', 'careers', 'cartier', 'casa', 'cash', 'cat', 'catering', 'cc', 'cd', 'center', 'ceo', 'cern', 'cf', 'cg', 'ch', 'channel', 'cheap', 'christmas', 'chrome', 'church', 'ci', 'citic', 'city', 'ck', 'cl', 'claims', 'cleaning', 'click', 'clinic', 'clothing', 'club', 'cm', 'cn', 'co', 'coach', 'codes', 'coffee', 'college', 'cologne', 'com', 'community', 'company', 'computer', 'condos', 'construction', 'consulting', 'contractors', 'cooking', 'cool', 'coop', 'country', 'cr', 'credit', 'creditcard', 'cricket', 'crs', 'cruises', 'cu', 'cuisinella', 'cv', 'cw', 'cx', 'cy', 'cymru', 'cz', 'dabur', 'dad', 'dance', 'dating', 'day', 'dclk', 'de', 'deals', 'degree', 'delivery', 'democrat', 'dental', 'dentist', 'desi', 'design', 'dev', 'diamonds', 'diet', 'digital', 'direct', 'directory', 'discount', 'dj', 'dk', 'dm', 'dnp', 'do', 'docs', 'domains', 'doosan', 'durban', 'dvag', 'dz', 'eat', 'ec', 'edu', 'education', 'ee', 'eg', 'email', 'emerck', 'energy', 'engineer', 'engineering', 'enterprises', 'equipment', 'er', 'es', 'esq', 'estate', 'et', 'eu', 'eurovision', 'eus', 'events', 'everbank', 'exchange', 'expert', 'exposed', 'fail', 'farm', 'fashion', 'feedback', 'fi', 'finance', 'financial', 'firmdale', 'fish', 'fishing', 'fit', 'fitness', 'fj', 'fk', 'flights', 'florist', 'flowers', 'flsmidth', 'fly', 'fm', 'fo', 'foo', 'forsale', 'foundation', 'fr', 'frl', 'frogans', 'fund', 'furniture', 'futbol', 'ga', 'gal', 'gallery', 'garden', 'gb', 'gbiz', 'gd', 'ge', 'gent', 'gf', 'gg', 'ggee', 'gh', 'gi', 'gift', 'gifts', 'gives', 'gl', 'glass', 'gle', 'global', 'globo', 'gm', 'gmail', 'gmo', 'gmx', 'gn', 'goog', 'google', 'gop', 'gov', 'gp', 'gq', 'gr', 'graphics', 'gratis', 'green', 'gripe', 'gs', 'gt', 'gu', 'guide', 'guitars', 'guru', 'gw', 'gy', 'hamburg', 'hangout', 'haus', 'healthcare', 'help', 'here', 'hermes', 'hiphop', 'hiv', 'hk', 'hm', 'hn', 'holdings', 'holiday', 'homes', 'horse', 'host', 'hosting', 'house', 'how', 'hr', 'ht', 'hu', 'ibm', 'id', 'ie', 'ifm', 'il', 'im', 'immo', 'immobilien', 'in', 'industries', 'info', 'ing', 'ink', 'institute', 'insure', 'int', 'international', 'investments', 'io', 'iq', 'ir', 'irish', 'is', 'it', 'iwc', 'jcb', 'je', 'jetzt', 'jm', 'jo', 'jobs', 'joburg', 'jp', 'juegos', 'kaufen', 'kddi', 'ke', 'kg', 'kh', 'ki', 'kim', 'kitchen', 'kiwi', 'km', 'kn', 'koeln', 'kp', 'kr', 'krd', 'kred', 'kw', 'ky', 'kyoto', 'kz', 'la', 'lacaixa', 'land', 'lat', 'latrobe', 'lawyer', 'lb', 'lc', 'lds', 'lease', 'legal', 'lgbt', 'li', 'lidl', 'life', 'lighting', 'limited', 'limo', 'link', 'lk', 'loans', 'london', 'lotte', 'lotto', 'lr', 'ls', 'lt', 'ltda', 'lu', 'luxe', 'luxury', 'lv', 'ly', 'ma', 'madrid', 'maison', 'management', 'mango', 'market', 'marketing', 'marriott', 'mc', 'md', 'me', 'media', 'meet', 'melbourne', 'meme', 'memorial', 'menu', 'mg', 'mh', 'miami', 'mil', 'mini', 'mk', 'ml', 'mm', 'mn', 'mo', 'mobi', 'moda', 'moe', 'monash', 'money', 'mormon', 'mortgage', 'moscow', 'motorcycles', 'mov', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'museum', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'nagoya', 'name', 'navy', 'nc', 'ne', 'net', 'network', 'neustar', 'new', 'nexus', 'nf', 'ng', 'ngo', 'nhk', 'ni', 'ninja', 'nl', 'no', 'np', 'nr', 'nra', 'nrw', 'nu', 'nyc', 'nz', 'okinawa', 'om', 'one', 'ong', 'onl', 'ooo', 'org', 'organic', 'osaka', 'otsuka', 'ovh', 'pa', 'paris', 'partners', 'parts', 'party', 'pe', 'pf', 'pg', 'ph', 'pharmacy', 'photo', 'photography', 'photos', 'physio', 'pics', 'pictures', 'pink', 'pizza', 'pk', 'pl', 'place', 'plumbing', 'pm', 'pn', 'pohl', 'poker', 'porn', 'post', 'pr', 'praxi', 'press', 'pro', 'prod', 'productions', 'prof', 'properties', 'property', 'ps', 'pt', 'pub', 'pw', 'py', 'qa', 'qpon', 'quebec', 're', 'realtor', 'recipes', 'red', 'rehab', 'reise', 'reisen', 'reit', 'ren', 'rentals', 'repair', 'report', 'republican', 'rest', 'restaurant', 'reviews', 'rich', 'rio', 'rip', 'ro', 'rocks', 'rodeo', 'rs', 'rsvp', 'ru', 'ruhr', 'rw', 'ryukyu', 'sa', 'saarland', 'sale', 'samsung', 'sarl', 'sb', 'sc', 'sca', 'scb', 'schmidt', 'schule', 'schwarz', 'science', 'scot', 'sd', 'se', 'services', 'sew', 'sexy', 'sg', 'sh', 'shiksha', 'shoes', 'shriram', 'si', 'singles', 'sj', 'sk', 'sky', 'sl', 'sm', 'sn', 'so', 'social', 'software', 'sohu', 'solar', 'solutions', 'soy', 'space', 'spiegel', 'sr', 'st', 'su', 'supplies', 'supply', 'support', 'surf', 'surgery', 'suzuki', 'sv', 'sx', 'sy', 'sydney', 'systems', 'sz', 'taipei', 'tatar', 'tattoo', 'tax', 'tc', 'td', 'technology', 'tel', 'temasek', 'tf', 'tg', 'th', 'tienda', 'tips', 'tires', 'tirol', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'today', 'tokyo', 'tools', 'top', 'town', 'toys', 'tp', 'tr', 'trade', 'training', 'travel', 'trust', 'tt', 'tui', 'tv', 'tw', 'tz', 'ua', 'ug', 'uk', 'university', 'uno', 'uol', 'us', 'uy', 'uz', 'va', 'vacations', 'vc', 've', 'vegas', 'ventures', 'versicherung', 'vet', 'vg', 'vi', 'viajes', 'video', 'villas', 'vision', 'vlaanderen', 'vn', 'vodka', 'vote', 'voting', 'voto', 'voyage', 'vu', 'wales', 'wang', 'watch', 'webcam', 'website', 'wed', 'wedding', 'wf', 'whoswho', 'wien', 'wiki', 'williamhill', 'wme', 'work', 'works', 'world', 'ws', 'wtc', 'wtf', 'xn--1qqw23a', 'xn--3bst00m', 'xn--3ds443g', 'xn--3e0b707e', 'xn--45brj9c', 'xn--45q11c', 'xn--4gbrim', 'xn--55qw42g', 'xn--55qx5d', 'xn--6frz82g', 'xn--6qq986b3xl', 'xn--80adxhks', 'xn--80ao21a', 'xn--80asehdb', 'xn--80aswg', 'xn--90a3ac', 'xn--b4w605ferd', 'xn--c1avg', 'xn--cg4bki', 'xn--clchc0ea0b2g2a9gcd', 'xn--czr694b', 'xn--czrs0t', 'xn--czru2d', 'xn--d1acj3b', 'xn--d1alf', 'xn--fiq228c5hs', 'xn--fiq64b', 'xn--fiqs8s', 'xn--fiqz9s', 'xn--flw351e', 'xn--fpcrj9c3d', 'xn--fzc2c9e2c', 'xn--gecrj9c', 'xn--h2brj9c', 'xn--hxt814e', 'xn--i1b6b1a6a2e', 'xn--io0a7i', 'xn--j1amh', 'xn--j6w193g', 'xn--kprw13d', 'xn--kpry57d', 'xn--kput3i', 'xn--l1acc', 'xn--lgbbat1ad8j', 'xn--mgb9awbf', 'xn--mgba3a4f16a', 'xn--mgbaam7a8h', 'xn--mgbab2bd', 'xn--mgbayh7gpa', 'xn--mgbbh1a71e', 'xn--mgbc0a9azcg', 'xn--mgberp4a5d4ar', 'xn--mgbx4cd0ab', 'xn--ngbc5azd', 'xn--node', 'xn--nqv7f', 'xn--nqv7fs00ema', 'xn--o3cw4h', 'xn--ogbpf8fl', 'xn--p1acf', 'xn--p1ai', 'xn--pgbs0dh', 'xn--q9jyb4c', 'xn--qcka1pmc', 'xn--rhqv96g', 'xn--s9brj9c', 'xn--ses554g', 'xn--unup4y', 'xn--vermgensberater-ctb', 'xn--vermgensberatung-pwb', 'xn--vhquv', 'xn--wgbh1c', 'xn--wgbl6a', 'xn--xhq521b', 'xn--xkc2al3hye2a', 'xn--xkc2dl3a5ee0h', 'xn--yfro4i67o', 'xn--ygbi2ammx', 'xn--zfr164b', 'xxx', 'xyz', 'yachts', 'yandex', 'ye', 'yoga', 'yokohama', 'youtube', 'yt', 'za', 'zip', 'zm', 'zone', 'zuerich', 'zw'];
  var PROTOCOLS = ['http:', 'https:', 'file:', 'ftp:', 'chrome:', 'chrome-extension:'];
  return function() {
    var url = this.trimAround();
    if (~url.indexOf(' '))
      return false;
    if (~url.search(/^(about|file):[^:]/))
      return true;
    var protocol = (url.match(/^([a-zA-Z\-]+:)[^:]/) || [''])[0].slice(0, -1);
    var protocolMatch = PROTOCOLS.indexOf(protocol) !== -1;
    if (protocolMatch)
      url = url.replace(/^[a-zA-Z\-]+:\/*/, '');
    var hasPath = /.*[a-zA-Z].*\//.test(url);
    url = url.replace(/(:[0-9]+)?([#\/].*|$)/g, '').split('.');
    if (protocolMatch && /^[a-zA-Z0-9@!]+$/.test(url))
      return true;
    if (protocol && !protocolMatch && protocol !== 'localhost:')
      return false;
    var isIP = url.every(function(e) { // IP addresses
      return /^[0-9]+$/.test(e) && +e >= 0 && +e < 256;
    });
    if ((isIP && !protocol && url.length === 4) || (isIP && protocolMatch))
      return true;
    return (url.every(function(e) { return /^[a-z0-9\-]+$/i.test(e); }) &&
            (url.length > 1 && TLDs.indexOf(url[url.length - 1]) !== -1)) ||
           (url.length === 1 && url[0] === 'localhost') || hasPath;
  };
})();

String.prototype.convertLink = function() {
  if (this.validURL()) {
    return (!/^[a-zA-Z\-]+:/.test(this) ? 'http://' : '') + this;
  }
  return 'https://www.google.com/search?q=' + encodeURIComponent(this);
};

(function($) {
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
            return $(this).width() * $(this).height() > 0 && $(this).offset().top > document.body.scrollTop;
        });
    };
})(jQuery);

(function() {
    var KeyboardUtils, root;

    KeyboardUtils = {
        keyCodes: {
            ESC: 27,
            backspace: 8,
            deleteKey: 46,
            enter: 13,
            ctrlEnter: 10,
            space: 32,
            shiftKey: 16,
            ctrlKey: 17,
            f1: 112,
            f12: 123,
            comma: 188,
            tab: 9,
            downArrow: 40,
            upArrow: 38
        },
        keyNames: {
            37: "left",
            38: "up",
            39: "right",
            40: "down"
        },
        keyIdentifierCorrectionMap: {
            "U+00C0": ["U+0060", "U+007E"],
            "U+0030": ["U+0030", "U+0029"],
            "U+0031": ["U+0031", "U+0021"],
            "U+0032": ["U+0032", "U+0040"],
            "U+0033": ["U+0033", "U+0023"],
            "U+0034": ["U+0034", "U+0024"],
            "U+0035": ["U+0035", "U+0025"],
            "U+0036": ["U+0036", "U+005E"],
            "U+0037": ["U+0037", "U+0026"],
            "U+0038": ["U+0038", "U+002A"],
            "U+0039": ["U+0039", "U+0028"],
            "U+00BD": ["U+002D", "U+005F"],
            "U+00BB": ["U+003D", "U+002B"],
            "U+00DB": ["U+005B", "U+007B"],
            "U+00DD": ["U+005D", "U+007D"],
            "U+00DC": ["U+005C", "U+007C"],
            "U+00BA": ["U+003B", "U+003A"],
            "U+00DE": ["U+0027", "U+0022"],
            "U+00BC": ["U+002C", "U+003C"],
            "U+00BE": ["U+002E", "U+003E"],
            "U+00BF": ["U+002F", "U+003F"]
        },
        init: function() {
            if (navigator.platform.indexOf("Mac") !== -1) {
                return this.platform = "Mac";
            } else if (navigator.userAgent.indexOf("Linux") !== -1) {
                return this.platform = "Linux";
            } else {
                return this.platform = "Windows";
            }
        },
        getKeyChar: function(event) {
            var character, correctedIdentifiers, keyIdentifier, unicodeKeyInHex;
            if (event.keyIdentifier.slice(0, 2) !== "U+") {
                if (this.keyNames[event.keyCode]) {
                    return this.keyNames[event.keyCode];
                }
                if (event.keyCode >= this.keyCodes.f1 && event.keyCode <= this.keyCodes.f12) {
                    return "f" + (1 + event.keyCode - keyCodes.f1);
                }
                return "";
            }
            keyIdentifier = event.keyIdentifier;
            if ((this.platform === "Windows" || this.platform === "Linux") && this.keyIdentifierCorrectionMap[keyIdentifier]) {
                correctedIdentifiers = this.keyIdentifierCorrectionMap[keyIdentifier];
                keyIdentifier = event.shiftKey ? correctedIdentifiers[1] : correctedIdentifiers[0];
            }
            unicodeKeyInHex = "0x" + keyIdentifier.substring(2);
            character = String.fromCharCode(parseInt(unicodeKeyInHex));
            character = event.shiftKey ? character : character.toLowerCase();
            if (event.ctrlKey) {
                character = 'c-' + character;
            }
            if (event.altKey) {
                character = 'a-' + character;
            }
            if (event.metaKey) {
                character = 'm-' + character;
            }
            return character;
        },
        isPrimaryModifierKey: function(event) {
            if (this.platform === "Mac") {
                return event.metaKey;
            } else {
                return event.ctrlKey;
            }
        },
        isEscape: function(event) {
            return (event.keyCode === this.keyCodes.ESC) || (event.ctrlKey && this.getKeyChar(event) === '[');
        },
        isWordChar: function(event) {
            return (event.keyCode < 123 && event.keyCode >= 97 || event.keyCode < 91 && event.keyCode >= 65 || event.keyCode < 58 && event.keyCode >= 48);
        },
        isPrintable: function(event) {
            var keyChar;
            if (event.metaKey || event.ctrlKey || event.altKey) {
                return false;
            }
            keyChar = event.type === "keypress" ? String.fromCharCode(event.charCode) : this.getKeyChar(event);
            return keyChar.length === 1;
        }
    };

    KeyboardUtils.init();

    root = typeof exports !== "undefined" && exports !== null ? exports : window;

    root.KeyboardUtils = KeyboardUtils;

    root.keyCodes = KeyboardUtils.keyCodes;

}).call(this);
