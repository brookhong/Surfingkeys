/*
*
* breakOn("aa.scrollTop", 1)            break when aa.scrollTop is changed
* breakOn("aa.scrollTop", 2, 0)         break when aa.scrollTop is expected(0)
* breakOn("aa.scrollTop", 0)            remove the breakpoint
*
*/
function breakOn(property, flag, expected) {
    var target = property.match(/(\S*)\.(.*)/);
    var object = eval(target[1]), property = target[2];
    var hash_magic = "_$_$" + property;
    if (!object.hasOwnProperty(hash_magic)) {
        object[hash_magic] = object[property];
    }

    // overwrite with accessor
    Object.defineProperty(object, property, {
        configurable: true,
        get: function () {
            return object[hash_magic];
        },

        set: function (value) {
            if (flag === 1) {
                debugger; // sets breakpoint
            } else if (flag === 2 && value === expected) {
                debugger; // sets breakpoint
            }
            object[hash_magic] = value;
        }
    });
}

function stackTrace() {
    var err = new Error();
    console.log(new Date().toLocaleString());
    console.log(err.stack.substr(6));
}

function time(fn) {
    var start = new Date().getTime();

    fn.call(fn);
    console.log(new Date().getTime() - start);
}
