function rmap(newKey, oldKey, domain, annotation) { // replacing map
    map(newKey, oldKey, domain, annotation);
    unmap(oldKey);
}

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
map('<F1>', '?');
map(']t', 'R');
map('[t', 'E');
rmap('{t', 'g0');
rmap('|t', '<Ctrl-6>');
rmap('}t', 'g$');
rmap(']s', 'cs');
map(']h', 'D');
map('[h', 'S');
rmap('[u', 'gu');
rmap('{u', 'gU');

rmap('<Alt-t>', '<Alt-s>'); // toggle surfkey
rmap('<Alt-s>', 'd'); // down
rmap('<Alt-w>', 'e'); // up
rmap('{i', 'gi');

// display hints
rmap('dh', '<Ctrl-h>');
rmap('dH', '<Ctrl-j>');
rmap('dmy', 'yma');
rmap('dyc', 'yc');
rmap('dyi', 'yi');
rmap('dyt', 'yv');// yank element text
rmap('dmyc', 'ymc');
rmap('di', 'q');
rmap('ds', 'zv'); // visual element select


// add
rmap('aj', ';i'); // add jquery
map('an', 'on');

// remove
unmap('r'); // r is used for remove, use ctrl-r to reload
rmap('rh', ';dh'); // delete history older than 30 days
rmap('rb', ';db'); // remove bookmark of this page
// open
rmap('oo', 'H'); // open opened tab in current tab
rmap('ot', 'Q'); // open selection with google translation

// show: s
rmap('ss', 'se', undefined, '#11Show settings');
rmap('sla', 'sql'); // show loat action
// close
rmap('cd', ';j');
rmap('c}', 'gx$');
rmap('c{', 'gx0');
rmap('c[', 'gxt');
rmap('c]', 'gxT');
rmap("c'", 'gxx');

// move
rmap('\\l', '<<');
rmap('\\r', '>>');
map('\\o', 'W');

// copy(yank)

// edit
rmap('eur', 'sU');
rmap('eut', 'su');


// undo: u
unmap('u');
rmap('uh', ';m'); // hover

// toggle
rmap(';pi', '<Alt-p>'); // pin
rmap(';pr', 'cp'); // proxy
rmap(';m', '<Alt-m>'); // mute

// mis
map('z0', 'zr');