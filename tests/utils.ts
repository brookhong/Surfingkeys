const path = require('path');
export const DIST_DIR = path.resolve(__dirname, '../dist/');

/*
 * wait for an Event of `obj` that matches `messageToWait` and is delivered from `messageDeliver`.
 */
export const waitForEvent = async (obj, evt, messageToWait, messageDeliver) => {
    await new Promise((r) => {
        const handler = (evt) => {
            var _message = evt.data;
            if (messageToWait(_message)) {
                obj.removeEventListener(evt, handler, true);
                r(_message);
            }
        };
        obj.addEventListener(evt, handler, true);
        messageDeliver();
    });
};
