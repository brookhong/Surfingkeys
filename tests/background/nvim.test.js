import { createNvimServer } from '../../src/background/nvim.js';

// Stands in for the port chrome.runtime.connectNative returns, so a test can act as
// the native host: answer a request, ignore one, or drop the connection.
const createPortStub = () => {
    const listeners = {message: [], disconnect: []};
    const port = {
        sent: [],
        postMessage: jest.fn((msg) => port.sent.push(msg)),
        onMessage: {addListener: (fn) => listeners.message.push(fn)},
        onDisconnect: {addListener: (fn) => listeners.disconnect.push(fn)},
        reply: (msg) => listeners.message.forEach((fn) => fn(msg)),
        drop: (error) => listeners.disconnect.forEach((fn) => fn(error ? {error} : {})),
        // What the host answers `startServer` with; until it lands, nothing knows a
        // host is there.
        start: () => port.reply({status: true, res: {event: 'serverStarted', port: 4321}}),
    };
    return port;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createNvimServer', () => {
    let port;

    beforeEach(() => {
        port = createPortStub();
        global.chrome = {
            runtime: {
                connectNative: jest.fn(() => port),
                lastError: undefined,
            },
            // LOG() reads its levels from here, and runs on a failed connection.
            storage: {local: {get: jest.fn((keys, cb) => cb({}))}},
        };
        global.self = {crypto: {getRandomValues: (a) => a.fill(7)}};
    });

    it('opens one connection and asks the host to start its server', () => {
        createNvimServer();
        expect(chrome.runtime.connectNative).toHaveBeenCalledTimes(1);
        expect(chrome.runtime.connectNative).toHaveBeenCalledWith('surfingkeys');
        expect(port.sent[0]).toMatchObject({startServer: true});
    });

    it('is not ready until the host has answered', async () => {
        const nvimServer = createNvimServer();
        expect(nvimServer.ready).toBe(false);
        port.start();
        await flush();
        expect(nvimServer.ready).toBe(true);
        expect(await nvimServer.instance).toMatchObject({url: expect.stringContaining('127.0.0.1:4321/')});
    });

    describe('request', () => {
        it('sends the command on the connection that is already open', async () => {
            const nvimServer = createNvimServer();
            port.start();
            const reply = nvimServer.request({command: 'Settings.read'});
            await flush();
            // No second connectNative: one neovim serves the editor and the read.
            expect(chrome.runtime.connectNative).toHaveBeenCalledTimes(1);
            const sent = port.sent[port.sent.length - 1];
            expect(sent).toMatchObject({command: 'Settings.read'});
            expect(sent.id).toBeDefined();
            port.reply({status: true, res: {data: 'file body'}, id: sent.id});
            await expect(reply).resolves.toMatchObject({res: {data: 'file body'}});
        });

        it('waits for the host to prove it is there before sending', async () => {
            const nvimServer = createNvimServer();
            nvimServer.request({command: 'Settings.read'});
            await flush();
            // Only startServer so far: a connection that may have no host behind it
            // would wait for a reply nobody sends.
            expect(port.sent).toHaveLength(1);
            port.start();
            await flush();
            expect(port.sent[1]).toMatchObject({command: 'Settings.read'});
        });

        it('gives each reply to the request it belongs to', async () => {
            const nvimServer = createNvimServer();
            port.start();
            const first = nvimServer.request({command: 'first'});
            const second = nvimServer.request({command: 'second'});
            await flush();
            const [, a, b] = port.sent;
            expect(a.id).not.toBe(b.id);
            // Answered out of order, which is why the id is on the wire at all.
            port.reply({status: true, res: {data: 'B'}, id: b.id});
            port.reply({status: true, res: {data: 'A'}, id: a.id});
            await expect(first).resolves.toMatchObject({res: {data: 'A'}});
            await expect(second).resolves.toMatchObject({res: {data: 'B'}});
        });

        it('accepts a reply with no id from a server.lua that does not echo one', async () => {
            const nvimServer = createNvimServer();
            port.start();
            const reply = nvimServer.request({command: 'Settings.read'});
            await flush();
            port.reply({status: true, res: {data: 'from an older host'}});
            await expect(reply).resolves.toMatchObject({res: {data: 'from an older host'}});
        });

        it('does not mistake the editor reply for an outstanding request', async () => {
            const nvimServer = createNvimServer();
            port.start();
            const reply = nvimServer.request({command: 'Settings.read'});
            await flush();
            let settled = false;
            reply.then(() => { settled = true; }, () => { settled = true; });
            // The editor's own messages carry no id, so shape is all that keeps this
            // out of the settings read's hands.
            port.reply({status: true, res: {mode: 'nvim'}});
            await flush();
            expect(settled).toBe(false);
            port.reply({status: true, res: {data: 'the real answer'}});
            await expect(reply).resolves.toMatchObject({res: {data: 'the real answer'}});
        });

        it('reports a dropped connection instead of waiting on it', async () => {
            const nvimServer = createNvimServer();
            port.start();
            await flush();
            const reply = nvimServer.request({command: 'Settings.read'});
            await flush();
            port.drop({message: 'Native host has exited.'});
            await expect(reply).rejects.toThrow('Native host has exited.');
        });

        it('reports a host that was never there', async () => {
            const nvimServer = createNvimServer();
            const reply = nvimServer.request({command: 'Settings.read'});
            // Never answered startServer, so nothing was ever running.
            port.drop({message: 'No such native application surfingkeys'});
            await expect(reply).rejects.toThrow('No such native application surfingkeys');
            expect(nvimServer.instance).toBeUndefined();
            expect(nvimServer.ready).toBe(false);
        });

        it('lets a caller that has given up release its request', async () => {
            const nvimServer = createNvimServer();
            port.start();
            const abandon = new AbortController();
            const abandoned = nvimServer.request({command: 'Settings.read'},
                {signal: abandon.signal});
            abandoned.catch(() => {});
            await flush();
            abandon.abort();
            await expect(abandoned).rejects.toThrow('abandoned');

            // A reply with no id is matched to the ONE outstanding request, so an
            // abandoned one left in place makes every later read unanswerable.
            const next = nvimServer.request({command: 'Settings.read'});
            await flush();
            port.reply({status: true, res: {data: 'still answerable'}});
            await expect(next).resolves.toMatchObject({res: {data: 'still answerable'}});
        });

        it('does not send a request that was abandoned before the host answered', async () => {
            const nvimServer = createNvimServer();
            const abandon = new AbortController();
            const abandoned = nvimServer.request({command: 'Settings.read'},
                {signal: abandon.signal});
            abandoned.catch(() => {});
            abandon.abort();
            port.start();
            await flush();
            await expect(abandoned).rejects.toThrow('abandoned');
            expect(port.sent).toHaveLength(1);
        });
    });

    describe('reconnecting', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });
        afterEach(() => {
            jest.useRealTimers();
        });

        // Reconnecting the instant a host dies would spawn `nvim` as fast as the OS
        // can fail it.
        it('waits before relaunching a host that had been working', async () => {
            const nvimServer = createNvimServer();
            port.start();
            const replacement = createPortStub();
            chrome.runtime.connectNative.mockImplementation(() => replacement);
            port.drop({message: 'Native host has exited.'});
            expect(nvimServer.ready).toBe(false);
            expect(chrome.runtime.connectNative).toHaveBeenCalledTimes(1);
            jest.advanceTimersByTime(999);
            expect(chrome.runtime.connectNative).toHaveBeenCalledTimes(1);
            jest.advanceTimersByTime(1);
            expect(chrome.runtime.connectNative).toHaveBeenCalledTimes(2);
            replacement.start();
            expect(nvimServer.ready).toBe(true);
        });

        it('waits longer each time the relaunch fails too, up to a cap', () => {
            createNvimServer();
            port.start();
            const attemptAfter = (ms) => {
                const before = chrome.runtime.connectNative.mock.calls.length;
                const next = createPortStub();
                chrome.runtime.connectNative.mockImplementation(() => next);
                jest.advanceTimersByTime(ms - 1);
                expect(chrome.runtime.connectNative).toHaveBeenCalledTimes(before);
                jest.advanceTimersByTime(1);
                expect(chrome.runtime.connectNative).toHaveBeenCalledTimes(before + 1);
                return next;
            };
            // Each relaunch dies without ever answering, so nothing resets the wait.
            let dying = port;
            [1000, 2000, 4000, 8000, 16000, 30000, 30000].forEach((expected) => {
                dying.drop({message: 'Native host has exited.'});
                dying = attemptAfter(expected);
            });
        });

        it('gives a host that answered the short wait again', () => {
            createNvimServer();
            port.start();
            const second = createPortStub();
            chrome.runtime.connectNative.mockImplementation(() => second);
            port.drop({message: 'Native host has exited.'});
            jest.advanceTimersByTime(1000);
            // This one got up and said so, so its death is a NEW failure.
            second.start();
            const third = createPortStub();
            chrome.runtime.connectNative.mockImplementation(() => third);
            second.drop({message: 'Native host has exited.'});
            jest.advanceTimersByTime(1000);
            expect(chrome.runtime.connectNative).toHaveBeenCalledTimes(3);
        });

        it('never gives up, so fixing the host brings the editor back', async () => {
            const nvimServer = createNvimServer();
            port.start();
            let dying = port;
            for (let i = 0; i < 20; i++) {
                const next = createPortStub();
                chrome.runtime.connectNative.mockImplementation(() => next);
                dying.drop({message: 'Native host has exited.'});
                jest.advanceTimersByTime(30000);
                dying = next;
            }
            dying.start();
            expect(nvimServer.ready).toBe(true);
        });

        // A caller waiting for the editor waits once, through however many
        // launches that takes.
        it('settles the instance a caller is already holding', async () => {
            const nvimServer = createNvimServer();
            port.start();
            await Promise.resolve();
            const replacement = createPortStub();
            chrome.runtime.connectNative.mockImplementation(() => replacement);
            port.drop({message: 'Native host has exited.'});
            // Taken during the wait, because a promise left resolved here hands out
            // the port that just died.
            const waiting = nvimServer.instance;
            let settled = null;
            waiting.then((value) => { settled = value; });
            jest.advanceTimersByTime(1000);
            const third = createPortStub();
            chrome.runtime.connectNative.mockImplementation(() => third);
            replacement.drop({message: 'Native host has exited.'});
            expect(nvimServer.instance).toBe(waiting);
            jest.advanceTimersByTime(2000);
            third.start();
            await Promise.resolve();
            expect(settled).toMatchObject({nm: third});
        });

        it('reconnects and serves a request on the new connection', async () => {
            const nvimServer = createNvimServer();
            port.start();
            const replacement = createPortStub();
            chrome.runtime.connectNative.mockImplementation(() => replacement);
            port.drop({message: 'Native host has exited.'});
            expect(nvimServer.ready).toBe(false);
            expect(nvimServer.instance).toBeDefined();
            jest.advanceTimersByTime(1000);
            replacement.start();
            expect(nvimServer.ready).toBe(true);
            const reply = nvimServer.request({command: 'Settings.read'});
            await Promise.resolve();
            await Promise.resolve();
            const sent = replacement.sent[replacement.sent.length - 1];
            expect(sent).toMatchObject({command: 'Settings.read'});
            replacement.reply({status: true, res: {data: 'after reconnect'}, id: sent.id});
            await expect(reply).resolves.toMatchObject({res: {data: 'after reconnect'}});
        });

        it('refuses a request made while the relaunch is still waiting', async () => {
            const nvimServer = createNvimServer();
            port.start();
            chrome.runtime.connectNative.mockImplementation(() => createPortStub());
            port.drop({message: 'Native host has exited.'});
            // Refused rather than held for some later connection: the caller has a
            // cached copy to use as soon as it knows, and the browser's own reason
            // keeps it from looking at the wrong end of this.
            await expect(nvimServer.request({command: 'Settings.read'}))
                .rejects.toThrow('Native host has exited.');
        });
    });
});
