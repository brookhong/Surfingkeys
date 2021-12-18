import { EventEmitter } from 'events';
import Nvim from 'src/nvim/Nvim';

import type { Transport } from 'src/nvim/types';

const mockTransport: Transport = Object.assign(new EventEmitter(), {
    send: jest.fn()
});

jest.mock('src/nvim/transport/websocket', (url) => {
    return (url) => {
        return mockTransport;
    };
});

describe('Nvim', () => {
    let nvim: Nvim;

    beforeEach(() => {
        nvim = new Nvim();
        nvim.connect("ws://mock");
    });

    describe('notification', () => {
        test('send `nvim_subscribe` when you subscribe', () => {
            nvim.on('onSomething', () => null);
            expect(mockTransport.send).toHaveBeenCalledWith('nvim:write', 1, 'nvim_subscribe', ['onSomething']);
        });

        test('does not subscribe twice on the same event', () => {
            nvim.on('onSomething', () => null);
            nvim.on('onSomething', () => null);
            expect(mockTransport.send).toHaveBeenCalledWith('nvim:write', 1, 'nvim_subscribe', ['onSomething']);
            expect(mockTransport.send).toHaveBeenCalledTimes(1);
        });

        test('send `nvim_unsubscribe` when you subscribe', () => {
            const listener = () => null;
            nvim.on('onSomething', listener);
            nvim.removeListener('onSomething', listener);
            expect(mockTransport.send).toHaveBeenCalledWith('nvim:write', 2, 'nvim_unsubscribe', ['onSomething']);
        });

        test('does not unsubscribe if you have events with that name', () => {
            const listener = () => null;
            const anotherListener = () => null;
            nvim.on('onSomething', listener);
            nvim.on('onSomething', anotherListener);
            nvim.removeListener('onSomething', listener);
            expect(mockTransport.send).not.toHaveBeenCalledWith('nvim:write', 2, 'nvim_unsubscribe', ['onSomething']);
        });

        test('receives notification for subscription', () => {
            const callback = jest.fn();
            nvim.on('onSomething', callback);
            mockTransport.emit('nvim:data', [2, 'onSomething', 'params1']);
            expect(callback).toHaveBeenCalledWith('params1');
            mockTransport.emit('nvim:data', [2, 'onSomething', 'params2']);
            expect(callback).toHaveBeenCalledWith('params2');
        });

        test('does not receives notifications that are not subscribed', () => {
            const callback = jest.fn();
            nvim.on('onSomething', callback);
            mockTransport.emit('nvim:data', [2, 'onSomethingElse', 'params1']);
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('request message type', () => {
        test('receives result of request', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementationOnce(() => {
                /* empty */
            });
            mockTransport.emit('nvim:data', [0]);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('predefined commands', () => {
        const commands = [
            ['subscribe', 'subscribe'],
            ['unsubscribe', 'unsubscribe'],
            ['callFunction', 'call_function'],
            ['command', 'command'],
            ['input', 'input'],
            ['inputMouse', 'input_mouse'],
            ['getMode', 'get_mode'],
            ['uiTryResize', 'ui_try_resize'],
            ['uiAttach', 'ui_attach'],
            ['getHlByName', 'get_hl_by_name'],
            ['paste', 'paste'],
        ] as const;
        commands.forEach(([command, request]) => {
            test(`${command}`, () => {
                nvim[command]('param1', 'param2');
                expect(mockTransport.send).toHaveBeenCalledWith('nvim:write', 1, `nvim_${request}`, ['param1', 'param2']);
            });
        });

        test('eval', () => {
            nvim.eval('param1');
            expect(mockTransport.send).toHaveBeenCalledWith('nvim:write', 1, `nvim_eval`, ['param1']);
        });

        test('getShortMode returns mode', async () => {
            const resultPromise = nvim.getShortMode();
            mockTransport.emit('nvim:data', [1, 1, null, { mode: 'n' }]);
            expect(await resultPromise).toBe('n');
        });

        test('getShortMode cut CTRL- from mode', async () => {
            const resultPromise = nvim.getShortMode();
            mockTransport.emit('nvim:data', [1, 1, null, { mode: 'CTRL-n' }]);
            expect(await resultPromise).toBe('n');
        });
    });

    test('emit `close` when transport emits `nvim:close`', () => {
        const callback1 = jest.fn();
        const callback2 = jest.fn();

        nvim.on('nvim:close', callback1);
        nvim.on('nvim:close', callback2);

        mockTransport.emit('nvim:close');

        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
    });
});
