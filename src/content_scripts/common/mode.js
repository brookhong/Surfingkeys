import {
    listElements,
    isInUIFrame,
    reportIssue,
} from './utils.js';
import { RUNTIME, dispatchSKEvent, runtime } from './runtime.js';
import KeyboardUtils from './keyboardUtils';

var mode_stack = [];

const Mode = function(name, statusLine) {
    this.name = name;
    this.statusLine = statusLine;
    this.eventListeners = {};
    this.addEventListener = function(evtName, handler) {
        this.eventListeners[evtName] = handler;

        if (!_listenedEvents.hasOwnProperty(evtName)) {
            _listenedEvents[evtName] = function(event) {
                handleStack(evtName, event);
            };
            window.addEventListener(evtName, _listenedEvents[evtName], true);
        }

        return this;
    };

    this.enter = function(priority, reentrant) {
        var pos = mode_stack.indexOf(this);
        if (!this.priority) {
            this.priority = priority || mode_stack.length;
        }

        if (pos === -1) {
            // push this mode into stack
            mode_stack.unshift(this);
        } else if (pos > 0) {
            if (reentrant) {
                // pop up all the modes over this
                mode_stack = mode_stack.slice(pos);
            } else {
                var modeList = mode_stack.map(function(u) { return u.name; }).join(',');
                reportIssue("Mode {0} pushed into mode stack again.".format(this.name), "Modes in stack: {0}".format(modeList));
            }
            // stackTrace();
        }

        mode_stack.sort(function(a,b) {
            return (a.priority < b.priority) ? 1 : ((b.priority < a.priority) ? -1 : 0);
        } );
        // var modes = mode_stack.map(function(m) {
        // return m.name;
        // }).join('->');
        // console.log('enter {0}, {1}'.format(this.name, modes));

        this.onEnter && this.onEnter();

        Mode.showStatus();
        return pos;
    };

    this.exit = function(peek) {
        var pos = mode_stack.indexOf(this);
        if (pos !== -1) {
            this.priority = 0;
            if (peek) {
                // for peek exit, we need push modes above this back to the stack.
                mode_stack.splice(pos, 1);
            } else {
                // otherwise, we just pop all modes above this inclusively.
                pos++;
                var popup = mode_stack.slice(0, pos);
                mode_stack = mode_stack.slice(pos);
            }

            // var modes = mode_stack.map(function(m) {
            // return m.name;
            // }).join('->');
            // console.log('exit {0}, {1}'.format(this.name, modes));
        }
        Mode.showStatus();
        this.onExit && this.onExit(pos);
    };
};

Mode.getCurrent = () => {
    return mode_stack[0];
};

Mode.specialKeys = {
    "<Alt-s>": ["<Alt-s>"],       // hotkey to toggleBlocklist
    "<Esc>": ["<Esc>"]
};

Mode.isSpecialKeyOf = function(specialKey, keyToCheck) {
    return (-1 !== Mode.specialKeys[specialKey].indexOf(KeyboardUtils.decodeKeystroke(keyToCheck)));
};

// Enable to stop propagation of the event whose keydown handler has been triggered
// Why we need this?
// For example, there is keyup event handler of `s` on some site to set focus on an input box,
// Now user presses `sg` to search with google, Surfingkeys got `s` and triggered its keydown handler.
// But keyup handler of the site also got triggered, then `g` was swallowed by the input box.
// This setting now is only turned on for Normal.
// For Hints, we could not turn on it, as keyup should be propagated to Normal
// to stop scrolling when holding a key.
var keysNeedKeyupSuppressed = [];
Mode.suppressKeyUp = function(keyCode) {
    if (keysNeedKeyupSuppressed.indexOf(keyCode) === -1) {
        keysNeedKeyupSuppressed.push(keyCode);
    }
};

function onAfterHandler(mode, event) {
    if (event.sk_stopPropagation) {
        event.stopImmediatePropagation();
        event.preventDefault();
    }
}

function handleStack(eventName, event, cb) {
    for (var i = 0; i < mode_stack.length && !event.sk_stopPropagation; i++) {
        var m = mode_stack[i];
        if (!event.sk_suppressed && m.eventListeners.hasOwnProperty(eventName)) {
            var handler = m.eventListeners[eventName];
            handler(event);
            onAfterHandler(m, event);
        }
        if (m.name === "Disabled") {
            break;
        }
        cb && cb(m);
    }
}

let eventListenerBeats = 0;
var suppressScrollEvent = 0, _listenedEvents = {
    "sentinel": (event) => {
        eventListenerBeats ++;
    },
    "keydown": function (event) {
        event.sk_keyName = KeyboardUtils.getKeyChar(event);
        if (mode_stack.length === 0 && window !== top) {
            // automatically boots iframe on demand
            dispatchSKEvent('iframeBoot');
            document.addEventListener("surfingkeys:userSettingsLoaded", () => {
                // proceed to handle the key event after userSettingsLoaded.
                handleStack("keydown", event);
            }, {once: true});
            return;
        }
        handleStack("keydown", event);
    },
    "keyup": function (event) {
        handleStack("keyup", event, function (m) {
            var i = keysNeedKeyupSuppressed.indexOf(event.keyCode);
            if (i !== -1) {
                event.stopImmediatePropagation();
                keysNeedKeyupSuppressed.splice(i, 1);
            }
        });
    },
    "scroll": function (event) {
        handleStack("scroll", event);
        if (suppressScrollEvent > 0) {
            event.stopImmediatePropagation();
            event.preventDefault();
            suppressScrollEvent--;
        }
    }
};

function init(cb) {
    mode_stack = [];
    for (var evtName in _listenedEvents) {
        window.addEventListener(evtName, _listenedEvents[evtName], true);
    }
    cb && cb();
}

Mode.hasScroll = function (el, direction, barSize) {
    var offset = (direction === 'y') ? ['scrollTop', 'height'] : ['scrollLeft', 'width'];
    var result = el[offset[0]];

    if (result < barSize) {
        // set scroll offset to barSize, and verify if we can get scroll offset as barSize
        var originOffset = el[offset[0]];
        el[offset[0]] = el.getBoundingClientRect()[offset[1]];
        result = el[offset[0]];
        if (result !== originOffset) {
            // this is valid for some site such as http://mail.live.com/
            suppressScrollEvent++;
        }
        el[offset[0]] = originOffset;
    }
    return result >= barSize;
};

Mode.getScrollableElements = function () {
    var nodes = listElements(document.body, NodeFilter.SHOW_ELEMENT, function(n) {
        return (Mode.hasScroll(n, 'y', 16) && n.scrollHeight > 200 ) || (Mode.hasScroll(n, 'x', 16) && n.scrollWidth > 200);
    });
    nodes.sort(function(a, b) {
        if (b.contains(a)) return 1;
        else if (a.contains(b)) return -1;
        return b.scrollHeight * b.scrollWidth - a.scrollHeight * a.scrollWidth;
    });
    // document.scrollingElement will be null when document.body.tagName === "FRAMESET", for example http://www.knoppix.org/
    if (document.scrollingElement && (document.scrollingElement.scrollHeight > window.innerHeight
        || document.scrollingElement.scrollWidth > window.innerWidth)) {
        nodes.unshift(document.scrollingElement);
    }
    return nodes;
};

Mode.init = (cb)=> {
    // For blank page in frames, we defer init to page loaded
    // as document.write will clear added eventListeners.
    if (window.location.href === "about:blank" && window.frameElement &&
        (!document.body || document.body.childElementCount === 0)) {
        window.frameElement.addEventListener("load", function(evt) {
            try {
                init(cb);
            } catch (e) {
                console.log("Error on blank iframe loaded: " + e);
            }
        });
    } else {
        init(cb);
    }
};


Mode.showStatus = function() {
    if (document.hasFocus() && mode_stack.length) {
        var cm = mode_stack[0];
        var sl = cm.statusLine || (runtime.conf.showModeStatus ? cm.name : "");
        if (sl !== "" && window !== top && !isInUIFrame()) {
            var pathname = window.location.pathname.split('/');
            if (pathname.length) {
                sl += " - frame: " + pathname[pathname.length - 1];
            }
        }
        dispatchSKEvent("front", ['showStatus', [sl]]);
    }
};

Mode.finish = function (mode) {
    var ret = false;
    if (mode.map_node !== mode.mappings || mode.pendingMap != null || mode.repeats) {
        mode.map_node = mode.mappings;
        mode.pendingMap = null;
        mode.isTrustedEvent && dispatchSKEvent("front", ['hideKeystroke']);
        if (mode.repeats) {
            mode.repeats = "";
        }
        ret = true;
    }
    return ret;
};

Mode.handleMapKey = function(event, onNoMatched) {
    var thisMode = this,
        key = event.sk_keyName;
    this.isTrustedEvent = this.__trust_all_events__ || event.isTrusted;

    var isEscKey = Mode.isSpecialKeyOf("<Esc>", key);
    if (isEscKey) {
        key = KeyboardUtils.encodeKeystroke("<Esc>");
    }

    var actionDone = false;
    if (isEscKey && Mode.finish(this)) {
        event.sk_stopPropagation = true;
        event.sk_suppressed = true;
        actionDone = true;
    } else if (this.pendingMap) {
        this.setLastKeys && this.setLastKeys(this.map_node.meta.word + key);
        var pf = this.pendingMap.bind(this);
        event.sk_stopPropagation = (!this.map_node.meta.stopPropagation
            || this.map_node.meta.stopPropagation(key));
        pf(key);
        actionDone = Mode.finish(thisMode);
    } else if (this.repeats !== undefined &&
        this.map_node === this.mappings &&
        runtime.conf.digitForRepeat &&
        (key >= "1" || (this.repeats !== "" && key >= "0")) && key <= "9" &&
        this.map_node.getWords().length > 0
    ) {
        // reset only after target action executed or cancelled
        this.repeats += key;
        this.isTrustedEvent && dispatchSKEvent("front", ['showKeystroke', key, this]);
        event.sk_stopPropagation = true;
    } else {
        var last = this.map_node;
        this.map_node = this.map_node.find(key);
        if (!this.map_node) {
            onNoMatched && onNoMatched(last);
            event.sk_suppressed = (last !== this.mappings);
            actionDone = Mode.finish(this);
        } else {
            if (this.map_node.meta) {
                var code = this.map_node.meta.code;
                if (code.length) {
                    // bound function needs arguments
                    this.pendingMap = code;
                    this.isTrustedEvent && dispatchSKEvent("front", ['showKeystroke', key, this]);
                    event.sk_stopPropagation = true;
                } else {
                    this.setLastKeys && this.setLastKeys(this.map_node.meta.word);
                    RUNTIME.repeats = parseInt(this.repeats) || 1;
                    event.sk_stopPropagation = (!this.map_node.meta.stopPropagation
                        || this.map_node.meta.stopPropagation(key));
                    if (RUNTIME.repeats > runtime.conf.repeatThreshold) {
                        dispatchSKEvent("front", ['showDialog', `Do you really want to repeat this action (${this.map_node.meta.annotation}) ${RUNTIME.repeats} times?`, () => {
                            while(RUNTIME.repeats > 0) {
                                code();
                                RUNTIME.repeats--;
                            }
                        }]);
                    } else {
                        while(RUNTIME.repeats > 0) {
                            code();
                            RUNTIME.repeats--;
                        }
                    }
                    actionDone = Mode.finish(thisMode);
                }
            } else {
                this.isTrustedEvent && dispatchSKEvent("front", ['showKeystroke', key, this]);
                event.sk_stopPropagation = true;
            }
        }
    }
    return actionDone;
};

Mode.checkEventListener = (onMissing) => {
    const previousState = eventListenerBeats;
    window.dispatchEvent(new CustomEvent("sentinel"))
    if (previousState === eventListenerBeats) {
        init();
        onMissing();
    }
};

export default Mode;
