import Mode from '../../src/content_scripts/common/mode.js';
import createNormal from '../../src/content_scripts/common/normal.js';
import KeyboardUtils from '../../src/content_scripts/common/keyboardUtils';

jest.mock('../../src/content_scripts/common/runtime.js', () => ({
    RUNTIME: jest.fn(),
    dispatchSKEvent: jest.fn(),
    runtime: {
        // inlined: the factory runs before this module's own const initializers
        conf: {
            editableSelector: "div.CodeMirror-scroll,div.ace_content",
            editableBodyCare: true,
            enableAutoFocus: true,
            digitForRepeat: true,
            repeatThreshold: 9,
            showModeStatus: false,
            stealFocusOnLoad: true,
        },
    },
}));

describe('normal mode keydown', () => {
    let normal;
    let command;

    // jsdom marks every script-dispatched event isTrusted === false, which is
    // exactly what a password manager's simulated typing looks like
    const pressX = (target) => target.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));

    beforeEach(() => {
        document.body.innerHTML = '<input id="password" type="password">';
        Mode.checkEventListener(() => {});
        normal = createNormal({ enter: jest.fn(), exit: jest.fn() });
        command = jest.fn();
        normal.mappings.add(KeyboardUtils.encodeKeystroke('x'), { code: command });
        normal.enter();
    });

    afterEach(() => {
        normal.exit();
    });

    test('an untrusted keydown on a focused input is not run as a command', () => {
        const input = document.getElementById('password');
        input.focus();

        pressX(input);

        expect(command).not.toHaveBeenCalled();
    });

    test('an untrusted keydown on a non-editable target still runs the command', () => {
        pressX(document.body);

        expect(command).toHaveBeenCalledTimes(1);
    });

    describe('feedkeys', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });
        afterEach(() => {
            jest.useRealTimers();
        });

        // feedkeys calls handleMapKey directly rather than dispatching a keydown,
        // so what the input ignores must still reach it
        test('still runs the command while an input is focused', () => {
            document.getElementById('password').focus();

            normal.feedkeys('x');
            jest.runAllTimers();

            expect(command).toHaveBeenCalledTimes(1);
        });
    });
});
