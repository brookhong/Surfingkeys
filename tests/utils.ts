const path = require('path');
export const DIST_DIR = path.resolve(__dirname, '../dist/');

/*
 * wait for a window message that matches `messageToWait` and is delivered from `messageDeliver`.
 */
export const waitForWindowMessage = async (messageToWait, messageDeliver) => {
    await new Promise((r) => {
        const handler = (evt) => {
            var _message = evt.data;
            if (messageToWait(_message)) {
                window.removeEventListener("message", handler, true);
                r(_message);
            }
        };
        window.addEventListener("message", handler, true);
        messageDeliver();
    });
};
