
settings.hintAlign = 'left';
unmap('r'); // r is used for remove, use ctrl-r to reload
unmap('u'); // u is used for undo;
/*
 ** iteration in collection or tree
 **
 ** {: fist or root
 ** }: last or last leaf
 ** ]: next
 ** [: previous
 ** t: to
 ** |: time based last used(active)
 **
 ** note:
 ** all command could be prefix with numbers to repeat.
 ** the prefix number for 'to' command is the object index in collection
 */
keyMaps = [
    ['<F1>', '?', false],
    [']t', 'R', false],
    ['[t', 'E', false],
    ['{t', 'g0', true],
    ['|t', '<Ctrl-6>', true],
    ['}t', 'g$', true],
    [']s', 'cs', true],
    [']h', 'D', false],
    ['[h', 'S', false],
    ['[u', 'gu', true],
    ['{u', 'gU', true],

    ['<Alt-t>', '<Alt-s>', true], // toggle surfkey
    ['<Alt-s>', 'd', true], // down
    ['<Alt-w>', 'e', true], // up
    ['{i', 'gi', true],

    // display hints
    ['dh', '<Ctrl-h>', true],
    ['dH', '<Ctrl-j>', true],
    ['dmy', 'yma', true],
    ['dmt', 'cf', true],
    ['dt', 'gf', true],
    ['dT', 'af', true],
    ['dyc', 'yc', true],
    ['dyi', 'yi', true],
    ['dyt', 'yv', true],// yank element text
    ['dmyc', 'ymc', true],
    ['di', 'q', true], // click image or button
    ['ds', 'zv', true], // visual element select


    // add
    ['aj', ';i', true], // add jquery

    // remove
    ['rh', ';dh', true], // delete history older than 30 days
    ['rb', ';db', true], // remove bookmark of this page

    // search and show
    ['sla', 'sql', true], // show last action
    ['sb', 'ob', true],
    ['sg', 'og', true],
    ['sd', 'od', true],
    ['sw', 'ow', true],
    ['sy', 'oy', true],
    // open
    ['oo', 'H', true], // open opened tab in current tab
    ['ot', 'Q', true], // open selection with google translation
    ['oo', 'se', true, '#11Open options'],
    ['oba', 'ga', true], // browser about
    ['obb', 'gb', true], // browser bookmark
    ['obc', 'gc', true], // browser cache
    ['obd', 'gd', true], // browser download
    ['obh', 'gh', true], // browser history
    ['obk', 'gk', true], // browser cookies
    ['obe', 'ge', true], // browser extensions
    ['obn', 'gn', true], // browser net-internals
    ['obs', 'gs', true], // browser page source
    ['obi', 'si', true], // browser inspect
    ['om', 'sm', true], // markdown preview

    // close
    ['cd', ';j', true],
    ['c}', 'gx$', true],
    ['c{', 'gx0', true],
    ['c[', 'gxt', true],
    ['c]', 'gxT', true],
    ["c'", 'gxx', true],

    // move
    ['\\l', '<<', true],
    ['\\r', '>>', true],
    ['\\o', 'W', false],

    // copy(yank)

    // edit
    ['eur', 'sU', true],
    ['eut', 'su', true],


    // undo: u
    ['uh', ';m', true], // hover
    ['uc', 'X'], // undo tab close
    // toggle
    [';pi', '<Alt-p>', true], // pin
    [';pr', 'cp', true], // proxy
    [';m', '<Alt-m>', true], // mute

    // mis
    ['z0', 'zr']
];

function rmap(newKey, oldKey, ummapOldKey, domain, annotation) { // replacing map
    map(newKey, oldKey, domain, annotation);
    !!ummapOldKey && unmap(oldKey);
}

keyMaps.forEach(map => {
    rmap(map[0], map[1], map[2], undefined, map[3]);
});