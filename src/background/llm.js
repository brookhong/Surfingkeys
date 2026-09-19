import { AwsClient } from 'aws4fetch';

class EventStreamParser {
    // https://smithy.io/2.0/aws/amazon-eventstream.html
    constructor() {
        this.buffer = new Uint8Array(0);
    }

    /**
     * @param {Uint8Array|Buffer} chunk
     * @returns {Array} messages parsed so far; a partial trailing message stays buffered
     */
    parse(chunk) {
        const newBuffer = new Uint8Array(this.buffer.length + chunk.length);
        newBuffer.set(this.buffer);
        newBuffer.set(chunk, this.buffer.length);
        this.buffer = newBuffer;

        const messages = [];

        while (this.buffer.length >= 16) { // minimum message size
            const totalLength = this.readInt32(0);

            if (this.buffer.length < totalLength) {
                console.log(this.buffer.length, totalLength);
                break; // wait for more data
            }

            const headersLength = this.readInt32(4);
            const headers = this.parseHeaders(12, headersLength);

            const payloadStart = 12 + headersLength;
            const payloadLength = totalLength - headersLength - 16; // prelude(8) + checksum(4) + message checksum(4)
            const payload = this.buffer.slice(payloadStart, payloadStart + payloadLength);

            messages.push({
                headers,
                payload: this.decodePayload(payload, headers)
            });

            this.buffer = this.buffer.slice(totalLength);
        }

        return messages;
    }

    readInt32(offset) {
        return (this.buffer[offset] << 24) |
            (this.buffer[offset + 1] << 16) |
            (this.buffer[offset + 2] << 8) |
            this.buffer[offset + 3];
    }

    parseHeaders(start, length) {
        const headers = {};
        let position = start;
        const end = start + length;

        while (position < end) {
            const nameLength = this.buffer[position++];
            const name = new TextDecoder().decode(
                this.buffer.slice(position, position + nameLength)
            );
            position += nameLength;

            const type = this.buffer[position++];
            const valueLength = (this.buffer[position] << 8) | this.buffer[position + 1];
            position += 2;

            const value = this.parseHeaderValue(
                type,
                this.buffer.slice(position, position + valueLength)
            );
            position += valueLength;

            headers[name] = value;
        }

        return headers;
    }

    parseHeaderValue(type, data) {
        switch (type) {
            case 0: // boolean false
                return true;
            case 1: // boolean true
                return false;
            case 2: // byte
                return data[0];
            case 3: // short
                return (data[0] << 8) | data[1];
            case 4: // integer
                return (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
            case 5: // long -- JS can't represent a full 64-bit int without loss
                return Number(new BigInt64Array(data.buffer)[0]);
            case 6: // byte array
                return data;
            case 7: // string
                return new TextDecoder().decode(data);
            case 8: // timestamp
                return new Date(Number(new BigInt64Array(data.buffer)[0]));
            default:
                throw new Error(`Unknown header value type: ${type}`);
        }
    }

    decodePayload(payload, headers) {
        const contentType = headers[':content-type'];

        if (!contentType) {
            return payload;
        }

        if (contentType === 'application/json') {
            return JSON.parse(new TextDecoder().decode(payload));
        }

        if (contentType.startsWith('text/')) {
            return new TextDecoder().decode(payload);
        }

        return payload;
    }
}

/*
 * Every provider returns a cancel function: aborting the fetch, not just the read,
 * matters because the model (and its cost) keeps running while the connection is
 * open. A cancelled request still reports through `fail`, so the caller's booking
 * is always released, even if the request never got as far as fetching.
 */

/*
 * Ensures a provider completes its caller exactly once, however the request ends.
 * The caller holds the shared `llmResponse` booking until completion, so a request
 * that never completes disables every LLM feature in that frame until reload --
 * every provider reports through `fail` rather than calling `opts.onComplete` directly.
 */
function completeOnce(opts) {
    let completed = false;
    const complete = (message) => {
        if (completed) {
            return;
        }
        completed = true;
        opts.onComplete(message);
    };
    return {
        complete,
        /*
         * Guarded the same as `complete`: a connect-timeout's `fail` triggers an abort,
         * whose own rejection calls `fail` again for the same request -- this stops
         * that second call from appending an "aborted" chunk after the real error.
         */
        fail: (msg) => {
            if (completed) {
                return;
            }
            completed = true;
            opts.onChunk(msg);
            opts.onComplete({});
        },
        // lets a read loop know whether it still needs to keep reading
        isDone: () => completed,
    };
}

/*
 * Bounds how long a provider waits to connect: on Safari a fetch to a dead
 * endpoint can hang forever instead of rejecting, leaving the caller stuck on its
 * last UI state and holding the `llmResponse` booking. Only the connect phase is
 * bounded -- callers clear the timer as soon as the fetch settles, so a
 * slow-but-live stream is never cut off.
 */
const CONNECT_TIMEOUT_MS = 20000;
function withConnectTimeout(abortCtrl, fail, providerLabel) {
    const timer = setTimeout(() => {
        abortCtrl.abort();
        fail(`Error: could not connect to ${providerLabel} (timed out after ${CONNECT_TIMEOUT_MS / 1000}s). Is it running and reachable?`);
    }, CONNECT_TIMEOUT_MS);
    return () => clearTimeout(timer);
}

let awsClient = null;
function bedrock(req, opts) {
    const abortCtrl = new AbortController();
    const { complete, fail, isDone } = completeOnce(opts);

    if (!awsClient) {
        /*
         * Names all three fields since a config missing any one registers no client
         * at all; mentions reloading since credentials come from page snippets that
         * must run again for this background to see them.
         */
        fail("Bedrock is not set up in this browser: settings.llm.bedrock needs accessKeyId, secretAccessKey and model, all three of them. If you have set them, reload the page so your snippets run again.");
        return () => abortCtrl.abort();
    }

    function transformMessages(messages) {
        return messages.map((m) => {
            if (typeof(m.content) === "string") {
                return {"role": m.role, "content": [ {"type": "text", "text": m.content} ]};
            } else {
                return m;
            }
        });
    }

    const parser = new EventStreamParser();

    const clearConnectTimeout = withConnectTimeout(abortCtrl, fail, 'Bedrock');

    awsClient.fetch(`https://bedrock-runtime.us-west-2.amazonaws.com/model/${awsClient.bedrockModel}/invoke-with-response-stream`, {
        method: 'POST',
        headers: {
            "accept": "application/vnd.amazon.eventstream",
            "Content-Type": "application/json",
            "x-amzn-bedrock-accept": "*/*",
        },
        aws: {
            service: "bedrock",
        },
        signal: abortCtrl.signal,
        body: JSON.stringify({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "tools": req.tools,
            // `tool_choice: "none"` ends tool calling for this turn, but `tools` must
            // stay declared -- the conversation already carries tool_use/tool_result
            // blocks, which are rejected without it.
            "tool_choice": req.tool_choice,
            "system": req.messages[0].content,
            "messages": transformMessages(req.messages.slice(1))
        })
    }).then(response => {
        clearConnectTimeout();
        const reader = response.body.getReader();

        let content_block = {};
        let message = {};

        // A tool call with no arguments streams no input_json_delta at all, leaving
        // this "" -- JSON.parse("") throws, which would otherwise kill the stream.
        function parseToolInput(raw) {
            if (!raw || !raw.trim()) {
                return {};
            }
            try {
                return JSON.parse(raw);
            } catch (e) {
                // truncated, e.g. the response hit max_tokens mid-arguments
                opts.onChunk(`\n\n**Warning:** ${content_block.name} was called with incomplete arguments.\n\n`);
                return {};
            }
        }

        function handleEvent(e) {
            switch (e.type) {
                case "message_start":
                    message = { "role": e.message.role, "content": [] };
                    break;
                case "content_block_start":
                    // every block type is kept, not just text/tool_use, so
                    // content_block_stop never re-pushes a stale previous block
                    content_block = e.content_block || {};
                    if (content_block.type === "text") {
                        opts.onChunk(content_block.text);
                    } else if (content_block.type === "tool_use") {
                        content_block.input_json = "";
                    }
                    break;
                case "content_block_delta":
                    switch (e.delta.type) {
                        case "text_delta":
                            opts.onChunk(e.delta.text);
                            content_block.text = (content_block.text || "") + e.delta.text;
                            break;
                        case "input_json_delta":
                            content_block.input_json = (content_block.input_json || "") + e.delta.partial_json;
                            break;
                    }
                    break;
                case "content_block_stop":
                    if (content_block.type === "tool_use") {
                        content_block.input = parseToolInput(content_block.input_json);
                        delete content_block.input_json;
                    }
                    if (message.content) {
                        message.content.push(content_block);
                    }
                    content_block = {};
                    break;
                case "message_stop":
                    complete(message);
                    break;
            }
        }

        function readStream() {
            reader.read().then(({done, value}) => {
                if (done) {
                    // stream ended without message_stop (e.g. connection dropped) -- still release the caller
                    if (!isDone()) {
                        fail("\n\n**Warning:** the response ended unexpectedly.");
                    }
                    return;
                }

                for (var m of parser.parse(value)) {
                    if (m.headers[":message-type"] === "exception") {
                        fail(m.payload.message);
                        return;
                    }
                    handleEvent(JSON.parse(atob(m.payload.bytes)));
                }

                if (isDone()) {
                    return;
                }
                readStream();
            }).catch(error => {
                // unobserved otherwise: this chain isn't returned to the outer promise
                fail(`Error: ${error.message}`);
            });
        }

        if (response.status == 200) {
            readStream();
        } else {
            // error body isn't an event stream -- read as text; release caller even if this read rejects
            reader.read().then(({done, value}) => {
                fail(value ? new TextDecoder().decode(value) : `Error ${response.status}: no response body`);
            }).catch(error => fail(`Error ${response.status}: ${error.message}`));
        }
    }).catch(error => {
        clearConnectTimeout();
        fail(`Error: ${error.message}`);
    });

    return () => abortCtrl.abort();
}

bedrock.init = function(opts) {
    const clientOpts = {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
        sessionToken: opts.sessionToken,
    };
    awsClient = new AwsClient(clientOpts);
    awsClient.bedrockModel = opts.model;
}

function ollama(req, opts) {
    const decoder = new TextDecoder();
    const abortCtrl = new AbortController();
    const { complete, fail, isDone } = completeOnce(opts);

    const clearConnectTimeout = withConnectTimeout(abortCtrl, fail, 'Ollama');

    fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        signal: abortCtrl.signal,
        body: JSON.stringify({
            "model": ollama.model || 'qwen2.5-coder:32b',
            "tools": req.tools,
            // forwarded on a best-effort basis -- Ollama's /api/chat doesn't document
            // `tool_choice`, so nothing may depend on it being honoured.
            "tool_choice": req.tool_choice,
            "messages": req.messages
        })
    }).then(response => {
        clearConnectTimeout();
        const reader = response.body.getReader();

        let toolCalls = [];
        let content = "";
        function readStream() {
            reader.read().then(({done, value}) => {
                if (done) {
                    // stream ended without a done line (e.g. ollama restarted) -- still release the caller
                    if (!isDone()) {
                        fail("\n\n**Warning:** the response ended unexpectedly.");
                    }
                    return;
                }

                try {
                    const chunk = decoder.decode(value).trim();
                    for (const c of chunk.split("\n")) {
                        const o = JSON.parse(c);
                        if (o.error) {
                            fail(o.error);
                            return;
                        }
                        if (o.message?.content) {
                            content += o.message.content;
                            opts.onChunk(o.message.content);
                        }
                        if (o.message?.tool_calls) {
                            toolCalls.push(...o.message.tool_calls);
                        }
                        if (o.done) {
                            // `content` already includes this final delta, so it's the whole answer
                            complete(Object.assign({ role: "assistant" }, o.message, {
                                content,
                                tool_calls: toolCalls,
                            }));
                            return;
                        }
                    }
                } catch (e) {
                    console.error('Error in onChunk:', e, value);
                }

                readStream();
            }).catch(error => {
                // unobserved otherwise: this chain isn't returned to the outer promise
                fail(`Error: ${error.message}`);
            });
        }

        if (response.status == 403) {
            fail("403 Forbidden, please restart Ollama with `OLLAMA_ORIGINS=chrome-extension://*`.");
        } else if (response.status !== 200) {
            fail(`Error ${response.status}: ollama refused the request.`);
        } else {
            readStream();
        }
    }).catch(error => {
        clearConnectTimeout();
        fail(`Error: ${error.message}`);
    });

    return () => abortCtrl.abort();
}

const customClients = {};

function openAICompatible(req, opts, client) {
    const decoder = new TextDecoder();
    const abortCtrl = new AbortController();
    const { complete, fail } = completeOnce(opts);

    if (!client) {
        fail('Please set up the provider correctly.');
        return () => abortCtrl.abort();
    }
    if (!client.serviceUrl) {
        fail('Please set service URL correctly.');
        return () => abortCtrl.abort();
    }
    if (!client.apiKey) {
        fail(`Please set api key for ${client.name || 'the provider'} correctly.`);
        return () => abortCtrl.abort();
    }
    if (!client.model) {
        fail('Please set model correctly.');
        return () => abortCtrl.abort();
    }

    const clearConnectTimeout = withConnectTimeout(abortCtrl, fail, client.name || 'the provider');

    /*
     * Joins EVERY text block, not just the first: a turn carried over from another
     * provider can hold text both before and after a tool call, and keeping only
     * block 0 would silently drop part of the answer. `tool_calls`/`tool_call_id`
     * are kept too, since a replayed tool conversation is rejected without them.
     */
    const textOf = content => (content || [])
        .filter(c => c && c.type === 'text' && c.text)
        .map(c => c.text)
        .join('\n\n');
    const transformMessages = msgs => msgs.map((m) => {
        const out = {
            role: m.role,
            content: typeof m.content === 'string' ? m.content : textOf(m.content),
        };
        if (m.tool_calls) {
            out.tool_calls = m.tool_calls;
        }
        if (m.tool_call_id) {
            out.tool_call_id = m.tool_call_id;
        }
        return out;
    });

    fetch(client.serviceUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${client.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: client.model,
            stream: true,
            tools: req.tools,
            // "none" ends tool calling for this turn while leaving `tools` declared,
            // since earlier turns of this conversation still refer to it
            tool_choice: req.tool_choice,
            messages: transformMessages(req.messages),
        }),
        signal: abortCtrl.signal,
    })
        .then(resp => {
            clearConnectTimeout();
            const reader = resp.body.getReader();
            let contentBlock = { type: 'text', text: '' };
            let fullContent = '';
            let emittedLen = 0;
            let afterThink = false;

            if (resp.status !== 200) {
                // error body isn't SSE -- the loop below would find no `data:` line and never release the caller
                reader.read().then(({ value }) => {
                    fail(`Error ${resp.status}: ${value ? decoder.decode(value) : 'no response body'}`);
                }).catch(err => fail(`Error ${resp.status}: ${err.message}`));
                return;
            }

            const addContent = (txt) => {
                fullContent += txt;
                let clean = fullContent;
                while (true) {
                    const start = clean.indexOf('<think>');
                    if (start === -1) break;
                    const end = clean.indexOf('</think>', start);
                    if (end === -1) break;
                    clean = clean.slice(0, start) + clean.slice(end + 7);
                    afterThink = true;
                }
                const lastStart = clean.lastIndexOf('<think>');
                if (lastStart !== -1) {
                    clean = clean.slice(0, lastStart);
                }
                if (clean.length > emittedLen) {
                    let emitText = clean.slice(emittedLen);
                    emittedLen = clean.length;
                    if (afterThink) {
                        const stripped = emitText.replace(/^\s+/, '');
                        if (stripped.length === 0) {
                            return;
                        }
                        emitText = stripped;
                        afterThink = false;
                    }
                    opts.onChunk(emitText);
                    contentBlock.text += emitText;
                }
            };

            // tool calls stream in fragments keyed by `index` -- accumulate each slot rather than replace it
            const toolCalls = [];
            const addToolCallDeltas = (deltas) => {
                deltas.forEach((d, n) => {
                    const at = d.index === undefined ? n : d.index;
                    if (!toolCalls[at]) {
                        toolCalls[at] = { id: '', type: 'function', function: { name: '', arguments: '' } };
                    }
                    const call = toolCalls[at];
                    if (d.id) {
                        call.id = d.id;
                    }
                    if (d.function && d.function.name) {
                        call.function.name += d.function.name;
                    }
                    if (d.function && d.function.arguments) {
                        call.function.arguments += d.function.arguments;
                    }
                });
            };

            const finish = () => {
                const message = { role: 'assistant', content: [contentBlock] };
                const calls = toolCalls.filter(Boolean);
                if (calls.length > 0) {
                    // tool results are keyed by id -- give one to a provider that streamed none
                    message.tool_calls = calls.map((c, n) => (
                        c.id ? c : Object.assign({}, c, { id: `call_${n}` })
                    ));
                }
                complete(message);
            };

            const readStream = () => {
                reader.read()
                    .then(({ done, value }) => {
                        if (done) {
                            // not every provider sends `[DONE]` before closing
                            finish();
                            return;
                        }
                        const chunk = decoder.decode(value);
                        try {
                            const lines = chunk.trim().split('\n\n');
                            const dataPat = /^data: /;
                            for (const line of lines) {
                                if (!dataPat.test(line)) {
                                    continue;
                                }
                                const data = line.replace(dataPat, '');
                                if (data === '[DONE]') {
                                    finish();
                                    return;
                                }
                                const o = JSON.parse(data);
                                const delta = o.choices?.[0]?.delta;
                                if (delta?.content) {
                                    addContent(delta.content);
                                }
                                if (delta?.tool_calls) {
                                    addToolCallDeltas(delta.tool_calls);
                                }
                            }
                        } catch (e) {
                            console.error('Error parsing chunk:', e);
                        }

                        readStream();
                    })
                    .catch(err => {
                        // abort is reported too so the caller is always released; only the
                        // log is skipped, since a cancellation isn't a fault
                        if (err.name !== 'AbortError') {
                            console.error('Stream error:', err);
                        }
                        fail(`Error: ${err.message}`);
                    });
            };

            readStream();
        })
        .catch(err => {
            clearConnectTimeout();
            if (err.name !== 'AbortError') {
                console.error('Fetch error:', err);
            }
            fail(`Error: ${err.message}`);
        });

    return () => abortCtrl.abort();
}

function custom(req, opts) {
    return openAICompatible(req, opts, customClients[req.provider]);
}

custom.register = function(name, client) {
    customClients[name] = client;
};

export default {
    bedrock,
    ollama,
    custom,
}
