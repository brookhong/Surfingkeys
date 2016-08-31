/*
*  A simple implementation of Trie by brook hong, for less memory usage and better performance.
*
*  Each node has at most two properties, stem or meta. All other properties are expected to be
*  one character, taken to be child of the node.
*
*/
var Trie = (function() {

    function Trie() {
        if (arguments.length > 0) {
            this.stem = arguments[0];
        }
        if (arguments.length > 1) {
            this.meta = arguments[1];
        }
    }

    Trie.prototype = {
        find: function(word) {
            var found = this, len = word.length;
            for (var i = 0; i < len && found; i++) {
                found = found[word[i]];
            }
            return found;
        },

        add: function(word, meta) {
            var node = this, len = word.length;
            for (var i = 0; i < len; i++) {
                var c = word[i];
                if (!node.hasOwnProperty(c)) {
                    var t = new Trie(c);
                    node[c] = t;
                    node = t;
                } else {
                    node = node[c];
                }
            }

            node.meta = meta;
        },

        remove: function(word) {
            var found = this, len = word.length, ancestor = [];
            for (var i = 0; i < len && found; i++) {
                // keep node in path for later to remove empty nodes
                ancestor.push(found);
                found = found[word[i]];
            }
            if (found) {
                var i = ancestor.length - 1,
                    node = ancestor[i];
                delete node[found.stem];
                found = node;
                while (found !== this && Object.keys(found).length === 1) {
                    // remove the node if it has only one property -- which should be stem
                    node = ancestor[--i];
                    delete node[found.stem];
                    found = node;
                }
            }
            return found;
        },

        getWords: function(prefix) {
            var ret = [], prefix = (prefix || "") + (this.stem || "");
            if (this.hasOwnProperty('meta')) {
                ret.push(prefix);
            }
            for (var k in this) {
                if (k.length === 1) {
                    ret = ret.concat(this[k].getWords(prefix));
                }
            }
            return ret;
        }
    };

    return Trie;
})();
