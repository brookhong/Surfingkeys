import llmClients from '../../src/background/llm.js';
import { AwsClient } from 'aws4fetch';

/*
 * Drive the bedrock provider over a synthetic Amazon EventStream.
 *
 * https://smithy.io/2.0/aws/amazon-eventstream.html -- the parser does not verify
 * the CRCs, so the two checksum slots are left as zeroes.
 */
function encodeFrame(payloadObject, messageType = "event") {
    const enc = new TextEncoder();
    const payload = enc.encode(JSON.stringify(payloadObject));

    const headerBytes = [];
    [[":content-type", "application/json"], [":message-type", messageType]]
        .forEach(([name, value]) => {
            const n = enc.encode(name);
            const v = enc.encode(value);
            // name length, name, value type 7 (string), value length, value
            headerBytes.push(n.length, ...n, 7, (v.length >> 8) & 0xff, v.length & 0xff, ...v);
        });

    const headersLength = headerBytes.length;
    const totalLength = headersLength + payload.length + 16;
    const frame = new Uint8Array(totalLength);
    const be32 = (offset, n) => {
        frame[offset] = (n >>> 24) & 0xff;
        frame[offset + 1] = (n >>> 16) & 0xff;
        frame[offset + 2] = (n >>> 8) & 0xff;
        frame[offset + 3] = n & 0xff;
    };
    be32(0, totalLength);           // 8..12 is the prelude CRC, left zero
    be32(4, headersLength);
    frame.set(headerBytes, 12);
    frame.set(payload, 12 + headersLength);
    return frame;                   // the trailing message CRC is left zero
}

// an ordinary event: the JSON is base64'd into the payload's `bytes` field
const eventFrame = (event) => encodeFrame({
    bytes: Buffer.from(JSON.stringify(event)).toString('base64'),
});
// an exception carries its message in the payload directly
const exceptionFrame = (message) => encodeFrame({ message }, "exception");

function streamOf(chunks) {
    let i = 0;
    return {
        status: 200,
        body: {
            getReader: () => ({
                read: () => Promise.resolve(
                    i < chunks.length ? { done: false, value: chunks[i++] } : { done: true }
                ),
            }),
        },
    };
}

// events for one assistant turn that calls a tool
const toolTurn = (partialJsonDeltas) => [
    { type: "message_start", message: { role: "assistant" } },
    {
        type: "content_block_start",
        content_block: { type: "tool_use", id: "toolu_1", name: "list_tabs", input: {} },
    },
    ...partialJsonDeltas.map((partial_json) => ({
        type: "content_block_delta",
        delta: { type: "input_json_delta", partial_json },
    })),
    { type: "content_block_stop" },
    { type: "message_stop" },
];

/*
 * Before init, in a module of its own: `awsClient` is module state and no init can
 * put it back to null, so this is the only way to see the unconfigured path -- the
 * one a background that has just been woken takes if the stored credentials cannot
 * be read back (see whenLlmProvidersReady in start.js).
 */
describe('bedrock before it is configured', () => {
    it('says which fields it needs, and releases the caller', () => {
        jest.isolateModules(() => {
            const fresh = require('../../src/background/llm.js').default;
            const onChunk = jest.fn();
            const onComplete = jest.fn();
            fresh.bedrock({ messages: [{ role: 'system', content: 'sys' }] }, { onChunk, onComplete });

            const said = onChunk.mock.calls.map((c) => c[0]).join('');
            expect(said).toContain('accessKeyId');
            expect(said).toContain('secretAccessKey');
            expect(said).toContain('model');
            // the case a user actually hits: configured, but this process lost it
            expect(said).toContain('reload the page');
            /*
             * The caller books the shared `llmResponse` handler for the request, so a
             * refusal that does not complete disables every LLM feature in that frame
             * until a reload.
             */
            expect(onComplete).toHaveBeenCalledWith({});
        });
    });
});

describe('bedrock streaming', () => {
    let onChunk;
    let onComplete;
    let opts;

    const chunksOf = (frames) => frames;
    const drive = (frames) => {
        AwsClient.prototype.fetch = jest.fn(() => Promise.resolve(streamOf(frames)));
        llmClients.bedrock({ messages: [{ role: 'system', content: 'sys' }] }, opts);
        return new Promise((resolve) => setTimeout(resolve, 0));
    };
    const run = (events) => drive(events.map((e) => (
        e.__exception ? exceptionFrame(e.message) : eventFrame(e)
    )));
    const chunkText = () => onChunk.mock.calls.map((c) => c[0]).join("");

    beforeEach(() => {
        onChunk = jest.fn();
        onComplete = jest.fn();
        opts = { onChunk, onComplete };
        llmClients.bedrock.init({ accessKeyId: 'AKIA', secretAccessKey: 'secret', model: 'claude' });
    });

    it('streams text and completes with the assembled message', async () => {
        await run([
            { type: "message_start", message: { role: "assistant" } },
            { type: "content_block_start", content_block: { type: "text", text: "" } },
            { type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } },
            { type: "content_block_delta", delta: { type: "text_delta", text: " world" } },
            { type: "content_block_stop" },
            { type: "message_stop" },
        ]);

        expect(chunkText()).toBe("Hello world");
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onComplete.mock.calls[0][0]).toEqual({
            role: "assistant",
            content: [{ type: "text", text: "Hello world" }],
        });
    });

    it('completes a tool call that takes no arguments', async () => {
        // no input_json_delta is sent at all when the input is empty, which used to
        // reach JSON.parse("") -> "Unexpected end of JSON input"
        await run(toolTurn([]));

        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onComplete.mock.calls[0][0].content).toEqual([
            { type: "tool_use", id: "toolu_1", name: "list_tabs", input: {} },
        ]);
        expect(onChunk).not.toHaveBeenCalled();
    });

    it('assembles tool arguments split across deltas', async () => {
        await run(toolTurn(['{"query"', ': "rust', ' async"}']));

        const block = onComplete.mock.calls[0][0].content[0];
        expect(block.input).toEqual({ query: "rust async" });
        expect(block.input_json).toBeUndefined();
    });

    it('warns but still completes when tool arguments are truncated', async () => {
        await run(toolTurn(['{"query": "unfini']));

        expect(chunkText()).toContain('incomplete arguments');
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onComplete.mock.calls[0][0].content[0].input).toEqual({});
    });

    it('reassembles a frame split across two reads', async () => {
        const frame = eventFrame({ type: "message_stop" });
        await drive([frame.slice(0, 5), frame.slice(5)]);

        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('does not duplicate a block for an unrecognised block type', async () => {
        await run([
            { type: "message_start", message: { role: "assistant" } },
            { type: "content_block_start", content_block: { type: "text", text: "hi" } },
            { type: "content_block_stop" },
            // a type this code does not model, e.g. extended thinking
            { type: "content_block_start", content_block: { type: "thinking", thinking: "..." } },
            { type: "content_block_stop" },
            { type: "message_stop" },
        ]);

        const content = onComplete.mock.calls[0][0].content;
        expect(content).toHaveLength(2);
        expect(content[0]).toEqual({ type: "text", text: "hi" });
        expect(content[1].type).toBe("thinking");
    });

    it('releases the caller when the stream ends without message_stop', async () => {
        await run([
            { type: "message_start", message: { role: "assistant" } },
            { type: "content_block_start", content_block: { type: "text", text: "cut" } },
        ]);

        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(chunkText()).toContain('ended unexpectedly');
    });

    it('reports an exception frame once and stops reading', async () => {
        await run([
            { __exception: true, message: "ThrottlingException" },
            { type: "message_stop" },
        ]);

        expect(onChunk).toHaveBeenCalledWith("ThrottlingException");
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onComplete.mock.calls[0][0]).toEqual({});
    });

    it('completes once when an event payload is not decodable', async () => {
        await drive([
            eventFrame({ type: "message_start", message: { role: "assistant" } }),
            encodeFrame({ bytes: "not-base64-json!!" }),
        ]);

        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onComplete.mock.calls[0][0]).toEqual({});
        expect(chunkText()).toContain('Error');
    });

    it('keeps the tools declared while forwarding tool_choice', async () => {
        AwsClient.prototype.fetch = jest.fn(() => Promise.resolve(streamOf([eventFrame({ type: "message_stop" })])));
        llmClients.bedrock({
            messages: [{ role: 'system', content: 'sys' }],
            tools: [{ name: 'read_page' }],
            tool_choice: { type: 'none' },
        }, opts);
        await new Promise((resolve) => setTimeout(resolve, 0));

        // anthropic rejects a request whose messages carry tool_use/tool_result
        // blocks with no `tools`, so refusing further calls has to be said with
        // tool_choice rather than by dropping the declarations
        const body = JSON.parse(AwsClient.prototype.fetch.mock.calls[0][1].body);
        expect(body.tools).toEqual([{ name: 'read_page' }]);
        expect(body.tool_choice).toEqual({ type: 'none' });
    });

    /*
     * The routes that never reach the stream. Each one has to release the caller
     * exactly once: it books the shared `llmResponse` handler for the request, so a
     * request that never completes silently disables every LLM feature in that frame
     * until a reload.
     */
    describe('a request that never reaches the stream', () => {
        it('reports a non-200 body and releases the caller', async () => {
            const err = new TextEncoder().encode('{"message":"AccessDeniedException"}');
            AwsClient.prototype.fetch = jest.fn(() => Promise.resolve({
                status: 403,
                body: { getReader: () => ({ read: () => Promise.resolve({ done: false, value: err }) }) },
            }));
            llmClients.bedrock({ messages: [{ role: 'system', content: 'sys' }] }, opts);
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(chunkText()).toContain('AccessDeniedException');
            expect(onComplete).toHaveBeenCalledTimes(1);
            expect(onComplete.mock.calls[0][0]).toEqual({});
        });

        it('releases the caller when even the error body cannot be read', async () => {
            AwsClient.prototype.fetch = jest.fn(() => Promise.resolve({
                status: 500,
                body: { getReader: () => ({ read: () => Promise.reject(new Error('socket closed')) }) },
            }));
            llmClients.bedrock({ messages: [{ role: 'system', content: 'sys' }] }, opts);
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(chunkText()).toContain('socket closed');
            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        it('releases the caller when the fetch itself rejects', async () => {
            AwsClient.prototype.fetch = jest.fn(() => Promise.reject(new Error('no network')));
            llmClients.bedrock({ messages: [{ role: 'system', content: 'sys' }] }, opts);
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(chunkText()).toContain('no network');
            expect(onComplete).toHaveBeenCalledTimes(1);
        });
    });
});

describe('openAI-compatible streaming', () => {
    let onChunk;
    let onComplete;
    let opts;

    const enc = new TextEncoder();
    // one SSE frame per read, the way a provider actually flushes them
    const sse = (events) => events.map((e) => enc.encode(
        `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`));
    const delta = (d) => ({ choices: [{ delta: d }] });

    const body = () => JSON.parse(global.fetch.mock.calls[0][1].body);
    const chunkText = () => onChunk.mock.calls.map((c) => c[0]).join("");
    const message = () => onComplete.mock.calls[0][0];

    const drive = (chunks, status = 200) => {
        global.fetch = jest.fn(() => Promise.resolve(Object.assign(streamOf(chunks), { status })));
        llmClients.custom({
            provider: 'deepseek',
            messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'hi' }],
            tools: [{ type: 'function', function: { name: 'read_page' } }],
        }, opts);
        return new Promise((resolve) => setTimeout(resolve, 0));
    };

    beforeEach(() => {
        onChunk = jest.fn();
        onComplete = jest.fn();
        opts = { onChunk, onComplete };
        llmClients.custom.register('deepseek', {
            serviceUrl: 'https://api.deepseek.com/chat/completions',
            apiKey: 'k',
            model: 'deepseek-chat',
        });
    });

    it('sends the tool declarations it was given', async () => {
        await drive(sse(['[DONE]']));

        expect(body().tools).toEqual([{ type: 'function', function: { name: 'read_page' } }]);
        expect(body().messages).toEqual([
            { role: 'system', content: 'sys' },
            { role: 'user', content: 'hi' },
        ]);
    });

    it('streams text and completes with the assembled message', async () => {
        await drive(sse([delta({ content: 'Hello' }), delta({ content: ' world' }), '[DONE]']));

        expect(chunkText()).toBe('Hello world');
        expect(message()).toEqual({ role: 'assistant', content: [{ type: 'text', text: 'Hello world' }] });
    });

    it('assembles a tool call whose arguments arrive in fragments', async () => {
        await drive(sse([
            delta({ tool_calls: [{ index: 0, id: 'call_1', function: { name: 'search_bo' } }] }),
            delta({ tool_calls: [{ index: 0, function: { name: 'okmarks', arguments: '{"query"' } }] }),
            delta({ tool_calls: [{ index: 0, function: { arguments: ': "rust"}' } }] }),
            '[DONE]',
        ]));

        expect(message().tool_calls).toEqual([{
            id: 'call_1',
            type: 'function',
            function: { name: 'search_bookmarks', arguments: '{"query": "rust"}' },
        }]);
    });

    it('keeps two calls of one turn apart by index', async () => {
        await drive(sse([
            delta({ tool_calls: [
                { index: 0, id: 'a', function: { name: 'list_tabs', arguments: '{}' } },
                { index: 1, id: 'b', function: { name: 'read_page', arguments: '{}' } },
            ] }),
            '[DONE]',
        ]));

        expect(message().tool_calls.map((c) => c.function.name)).toEqual(['list_tabs', 'read_page']);
    });

    it('gives a call an id when the provider streamed none', async () => {
        // the tool result is keyed by the id, so an empty one is unanswerable
        await drive(sse([
            delta({ tool_calls: [{ index: 0, function: { name: 'list_tabs', arguments: '{}' } }] }),
            '[DONE]',
        ]));

        expect(message().tool_calls[0].id).toBeTruthy();
    });

    it('leaves tool_calls off an ordinary answer', async () => {
        await drive(sse([delta({ content: 'plain' }), '[DONE]']));

        expect(message()).not.toHaveProperty('tool_calls');
    });

    it('replays tool_calls and tool_call_id back to the provider', async () => {
        global.fetch = jest.fn(() => Promise.resolve(Object.assign(streamOf(sse(['[DONE]'])), { status: 200 })));
        llmClients.custom({
            provider: 'deepseek',
            messages: [
                { role: 'system', content: 'sys' },
                { role: 'assistant', content: [{ type: 'text', text: '' }], tool_calls: [{ id: 'call_1' }] },
                { role: 'tool', tool_call_id: 'call_1', content: 'the page text' },
            ],
        }, opts);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(body().messages[1]).toEqual({ role: 'assistant', content: '', tool_calls: [{ id: 'call_1' }] });
        expect(body().messages[2]).toEqual({ role: 'tool', tool_call_id: 'call_1', content: 'the page text' });
    });

    /*
     * A conversation carried over from the anthropic shape has its turns folded
     * together, so one turn holds what the model said before AND after a tool call.
     * Keeping only block 0 drops the answer while the chat still shows it, which
     * looks like the provider losing text rather than like a bug here.
     */
    it('sends every text block of a turn, not just the first', async () => {
        global.fetch = jest.fn(() => Promise.resolve(Object.assign(streamOf(sse(['[DONE]'])), { status: 200 })));
        llmClients.custom({
            provider: 'deepseek',
            messages: [
                { role: 'system', content: 'sys' },
                {
                    role: 'assistant',
                    content: [
                        { type: 'text', text: 'let me look' },
                        { type: 'tool_use', id: 'u1', name: 'read_page', input: {} },
                        { type: 'text', text: 'the answer' },
                    ],
                },
            ],
        }, opts);
        await new Promise((resolve) => setTimeout(resolve, 0));

        // the tool block is the other provider's bookkeeping and has no text
        expect(body().messages[1]).toEqual({ role: 'assistant', content: 'let me look\n\nthe answer' });
    });

    it('sends an empty string for a turn with no text block at all', async () => {
        global.fetch = jest.fn(() => Promise.resolve(Object.assign(streamOf(sse(['[DONE]'])), { status: 200 })));
        llmClients.custom({
            provider: 'deepseek',
            messages: [
                { role: 'system', content: 'sys' },
                { role: 'assistant', content: [{ type: 'tool_use', id: 'u1', name: 'read_page', input: {} }] },
            ],
        }, opts);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(body().messages[1]).toEqual({ role: 'assistant', content: '' });
    });

    it('releases the caller when the stream ends without [DONE]', async () => {
        await drive(sse([delta({ content: 'cut' })]));

        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(message().content).toEqual([{ type: 'text', text: 'cut' }]);
    });

    it('reports an error response instead of waiting for SSE that never comes', async () => {
        await drive([enc.encode('{"error":{"message":"tools not supported"}}')], 400);

        expect(chunkText()).toContain('tools not supported');
        expect(chunkText()).toContain('400');
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(message()).toEqual({});
    });

    it('completes exactly once when [DONE] is followed by the stream end', async () => {
        await drive(sse([delta({ content: 'hi' }), '[DONE]']));

        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('reports a misconfigured provider and releases the caller', async () => {
        llmClients.custom.register('deepseek', { serviceUrl: 'https://x', model: 'm' });

        llmClients.custom({ provider: 'deepseek', messages: [] }, opts);

        expect(chunkText()).toContain('api key');
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('forwards tool_choice, so the tools can stay declared while being refused', async () => {
        global.fetch = jest.fn(() => Promise.resolve(Object.assign(streamOf(sse(['[DONE]'])), { status: 200 })));
        llmClients.custom({
            provider: 'deepseek',
            messages: [{ role: 'system', content: 'sys' }],
            tools: [{ type: 'function', function: { name: 'read_page' } }],
            tool_choice: 'none',
        }, opts);
        await new Promise((resolve) => setTimeout(resolve, 0));

        // the conversation carries tool calls by then, and dropping `tools` from a
        // request that replays them is what a provider rejects
        expect(body().tools).toHaveLength(1);
        expect(body().tool_choice).toBe('none');
    });
});

describe('ollama streaming', () => {
    let onChunk;
    let onComplete;
    let opts;

    const enc = new TextEncoder();
    // ollama streams newline-delimited JSON, and a read may carry several lines
    const ndjson = (lines) => lines.map((l) => enc.encode(
        (Array.isArray(l) ? l : [l]).map((o) => JSON.stringify(o)).join("\n") + "\n"));
    const part = (content) => ({ message: { role: 'assistant', content }, done: false });
    const end = (message = { role: 'assistant', content: '' }) => ({ message, done: true });

    const body = () => JSON.parse(global.fetch.mock.calls[0][1].body);
    const chunkText = () => onChunk.mock.calls.map((c) => c[0]).join("");
    const message = () => onComplete.mock.calls[0][0];

    const drive = (chunks, status = 200) => {
        global.fetch = jest.fn(() => Promise.resolve(Object.assign(streamOf(chunks), { status })));
        llmClients.ollama({
            messages: [{ role: 'system', content: 'sys' }],
            tools: [{ type: 'function', function: { name: 'list_tabs' } }],
        }, opts);
        return new Promise((resolve) => setTimeout(resolve, 0));
    };

    beforeEach(() => {
        onChunk = jest.fn();
        onComplete = jest.fn();
        opts = { onChunk, onComplete };
    });

    it('streams text and completes once with the whole answer', async () => {
        await drive(ndjson([part('Hello'), part(' world'), end()]));

        expect(chunkText()).toBe('Hello world');
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(message().content).toBe('Hello world');
    });

    it('does not count the final message content twice', async () => {
        // ollama repeats nothing here, but it is free to put the last token on the
        // `done` line, which used to be appended to the accumulated text
        await drive(ndjson([part('Hel'), { message: { content: 'lo' }, done: true }]));

        expect(message().content).toBe('Hello');
    });

    it('assembles the tool calls of a turn', async () => {
        await drive(ndjson([
            { message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'list_tabs', arguments: {} } }] } },
            end(),
        ]));

        expect(message().tool_calls).toEqual([{ function: { name: 'list_tabs', arguments: {} } }]);
    });

    it('releases the caller when the stream ends without a done line', async () => {
        await drive(ndjson([part('cut off')]));

        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(message()).toEqual({});
        expect(chunkText()).toContain('ended unexpectedly');
    });

    it('reports an error line once and stops reading', async () => {
        await drive(ndjson([{ error: 'model not found' }, part('never shown')]));

        expect(chunkText()).toBe('model not found');
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(message()).toEqual({});
    });

    it('completes exactly once when the done line is followed by the stream end', async () => {
        await drive(ndjson([part('hi'), end()]));

        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('explains a 403 instead of hanging', async () => {
        await drive([], 403);

        expect(chunkText()).toContain('OLLAMA_ORIGINS');
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('reports any other error status', async () => {
        await drive([], 500);

        expect(chunkText()).toContain('500');
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('completes once when a chunk is not decodable', async () => {
        global.fetch = jest.fn(() => Promise.resolve(Object.assign({
            status: 200,
            body: { getReader: () => ({ read: () => Promise.reject(new Error('connection reset')) }) },
        }, {})));
        llmClients.ollama({ messages: [] }, opts);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(chunkText()).toContain('connection reset');
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('sends the tool declarations and forwards tool_choice', async () => {
        await drive(ndjson([end()]));
        expect(body().tools).toHaveLength(1);
        expect(body().tool_choice).toBeUndefined();

        global.fetch = jest.fn(() => Promise.resolve(Object.assign(streamOf(ndjson([end()])), { status: 200 })));
        llmClients.ollama({ messages: [], tools: [], tool_choice: 'none' }, opts);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(JSON.parse(global.fetch.mock.calls[0][1].body).tool_choice).toBe('none');
    });
});
