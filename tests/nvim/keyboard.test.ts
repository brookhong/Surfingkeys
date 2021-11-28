import initKeyboard from 'src/nvim/input/keyboard';

import Nvim from 'src/nvim/Nvim';
import { Screen } from 'src/nvim/screen';

describe('Keyboard input', () => {
    const nvimOn = jest.fn();

    const screen = ({
        getCursorElement: jest.fn<HTMLDivElement, void[]>(),
    } as unknown) as Screen;

    const nvim = ({
        input: jest.fn(),
        on: nvimOn,
    } as unknown) as Nvim;

    const simulateKeyDown = (options: KeyboardEventInit) => {
        const event = new KeyboardEvent('keydown', options);
        document.dispatchEvent(event);
    };

    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

    beforeEach(() => {
        const kbd = initKeyboard({ screen, nvim });
        kbd.attach();
    });

    afterEach(() => {
        const rootElm = document.documentElement;
        rootElm.innerHTML = '<head></head><body></body>';
        addEventListenerSpy.mock.calls.forEach(([event, callback, options]) =>
            document.removeEventListener(event, callback, options),
        );
    });

    describe('key input', () => {
        test('sends key value to nvim input', () => {
            simulateKeyDown({ key: 'i' });
            expect(nvim.input).toHaveBeenCalledWith('i');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test('special key', () => {
            simulateKeyDown({ code: 'Insert' });
            expect(nvim.input).toHaveBeenCalledWith('<Insert>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test('special key with Shift', () => {
            simulateKeyDown({ code: 'Insert', shiftKey: true });
            expect(nvim.input).toHaveBeenCalledWith('<S-Insert>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test('special key with modifier', () => {
            simulateKeyDown({ code: 'Insert', altKey: true });
            expect(nvim.input).toHaveBeenCalledWith('<A-Insert>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test('< key', () => {
            simulateKeyDown({ key: '<', shiftKey: true });
            expect(nvim.input).toHaveBeenCalledWith('<lt>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test('\\ key', () => {
            simulateKeyDown({ key: '\\' });
            expect(nvim.input).toHaveBeenCalledWith('<Bslash>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test('| key', () => {
            simulateKeyDown({ key: '|' });
            expect(nvim.input).toHaveBeenCalledWith('<Bar>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test.todo('TODO: test all special keys');
    });

    describe('motifiers', () => {
        test('CTRL key adds <C-*> modifier', () => {
            simulateKeyDown({ key: 'i', ctrlKey: true });
            expect(nvim.input).toHaveBeenCalledWith('<C-i>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test('Option key adds <A-*> modifier', () => {
            simulateKeyDown({ key: 'i', altKey: true });
            expect(nvim.input).toHaveBeenCalledWith('<A-i>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test('CMD key adds <D-*> modifier', () => {
            simulateKeyDown({ key: 'i', metaKey: true });
            expect(nvim.input).toHaveBeenCalledWith('<D-i>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test('Shift key does not add modifier without other motifiers', () => {
            simulateKeyDown({ key: 'I', shiftKey: true });
            expect(nvim.input).toHaveBeenCalledWith('I');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test('Shift adds modifier with other motifiers', () => {
            simulateKeyDown({ key: 'i', ctrlKey: true, shiftKey: true });
            expect(nvim.input).toHaveBeenCalledWith('<C-S-i>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test('multiple motifiers', () => {
            simulateKeyDown({ key: 'i', ctrlKey: true, metaKey: true, altKey: true, shiftKey: true });
            expect(nvim.input).toHaveBeenCalledWith('<D-A-C-S-i>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });
    });

    describe('Option key modifier', () => {
        test("Map Dead key with Option to it's latin value", () => {
            simulateKeyDown({ key: 'Dead', code: 'KeyI', altKey: true });
            expect(nvim.input).toHaveBeenCalledWith('<A-i>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        test('Skip Dead key if Option is not pressed', () => {
            simulateKeyDown({ key: 'Dead', code: 'KeyI' });
            expect(nvim.input).toHaveBeenCalledTimes(0);
        });

        test('Skip Dead key if there are no latin code for it', () => {
            simulateKeyDown({ key: 'Dead', code: 'NotKeyI', altKey: true });
            expect(nvim.input).toHaveBeenCalledTimes(0);
        });

        test('Adds A- modifier for non-Dead key', () => {
            simulateKeyDown({ key: '∆', altKey: true });
            expect(nvim.input).toHaveBeenCalledWith('<A-∆>');
            expect(nvim.input).toHaveBeenCalledTimes(1);
        });

        describe('with input mode', () => {
            beforeEach(() => {
                nvimOn.mock.calls[0][1]([['mode_change', ['insert']]]);
            });

            test('Does not add A- modifier', () => {
                simulateKeyDown({ key: '∆', code: 'KeyJ', altKey: true });
                expect(nvim.input).toHaveBeenCalledWith('∆');
                expect(nvim.input).toHaveBeenCalledTimes(1);
            });

            test('Does not add A- modifier with Shift', () => {
                simulateKeyDown({ key: 'Ô', code: 'KeyJ', altKey: true, shiftKey: true });
                expect(nvim.input).toHaveBeenCalledWith('Ô');
                expect(nvim.input).toHaveBeenCalledTimes(1);
            });

            test('Adds A- modifier with Control', () => {
                simulateKeyDown({ key: '∆', code: 'KeyJ', altKey: true, ctrlKey: true });
                expect(nvim.input).toHaveBeenCalledWith('<A-C-∆>');
                expect(nvim.input).toHaveBeenCalledTimes(1);
            });

            test('Adds A- modifier with Command', () => {
                simulateKeyDown({ key: '∆', code: 'KeyJ', altKey: true, metaKey: true });
                expect(nvim.input).toHaveBeenCalledWith('<D-A-∆>');
                expect(nvim.input).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('focus input', () => {
        let input: HTMLInputElement;
        let focusSpy: jest.SpyInstance;
        let blurSpy: jest.SpyInstance;

        beforeEach(() => {
            input = document.getElementsByTagName('input')[0];
            focusSpy = jest.spyOn(input, 'focus');
            blurSpy = jest.spyOn(input, 'blur');
        });

        test('focus input on insert mode', () => {
            nvimOn.mock.calls[0][1]([['mode_change', ['insert']]]);
            expect(focusSpy).toHaveBeenCalled();
        });

        test('focus input on cmdline_normal mode', () => {
            nvimOn.mock.calls[0][1]([['mode_change', ['cmdline_normal']]]);
            expect(focusSpy).toHaveBeenCalled();
        });

        test('blurs input on other modes', () => {
            nvimOn.mock.calls[0][1]([['mode_change', ['normal']]]);
            expect(blurSpy).toHaveBeenCalled();
        });
    });
});
