var Gist = (function() {
    var self = {};

    function _initGist(token, magic_word, onGistReady) {
        httpRequest({
            url: "https://api.github.com/gists",
            headers: {
                'Authorization': 'token ' + token
            }
        }, function(res) {
            var gists = JSON.parse(res.text);
            var gist = "";
            gists.forEach(function(g) {
                if (g.hasOwnProperty('description') && g['description'] === magic_word && g.files.hasOwnProperty(magic_word)) {
                    gist = g.id;
                }
            });
            if (gist === "") {
                httpRequest({
                    url: "https://api.github.com/gists",
                    headers: {
                        'Authorization': 'token ' + token
                    },
                    data: '{ "description": "Surfingkeys", "public": false, "files": { "Surfingkeys": { "content": "Surfingkeys" } } }'
                }, function(res) {
                    var ng = JSON.parse(res.text);
                    onGistReady(ng.id);
                });
            } else {
                onGistReady(gist);
            }
        });
    }

    var _token, _gist = "", _comments = [];
    self.initGist = function(token, onGistReady) {
        _token = token;
        _initGist(_token, "Surfingkeys", function(gist) {
            _gist = gist;
            onGistReady && onGistReady(gist);
        });
    };

    self.newComment = function(text) {
        httpRequest({
            url: "https://api.github.com/gists/{0}/comments".format(_gist),
            headers: {
                'Authorization': 'token ' + _token
            },
            data: '{"body": "{0}"}'.format(encodeURIComponent(text))
        }, function(res) {
            console.log(res);
        });
    };

    function _readComment(cid) {
        httpRequest({
            url: "https://api.github.com/gists/{0}/comments/{1}".format(_gist, cid),
            headers: {
                'Authorization': 'token ' + _token
            }
        }, function(res) {
            var comment = JSON.parse(res.text);
            console.log(decodeURIComponent(comment.body));
        });
    }
    self.readComment = function(nr) {
        if (nr >= _comments.length) {
            httpRequest({
                url: "https://api.github.com/gists/{0}/comments".format(_gist),
                headers: {
                    'Authorization': 'token ' + _token
                }
            }, function(res) {
                _comments = JSON.parse(res.text).map(function(c) {
                    return c.id;
                });
                if (nr < _comments.length) {
                    _readComment(_comments[nr]);
                }
            });
        } else {
            _readComment(_comments[nr]);
        }
    };

    return self;
})();
Gist.initGist('****************************************');
Gist.readComment(1);
// Gist.newComment("abc");
