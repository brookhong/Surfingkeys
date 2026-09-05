import { AwsClient } from 'aws4fetch';

class EventStreamParser {
    // https://smithy.io/2.0/aws/amazon-eventstream.html
    constructor() {
        this.buffer = new Uint8Array(0);
    }

    /**
     * Parse an EventStream message from a Uint8Array or Buffer
     * @param {Uint8Array|Buffer} chunk - Raw binary data chunk
     * @returns {Array} Array of parsed messages
     */
    parse(chunk) {
        // Append new chunk to existing buffer
        const newBuffer = new Uint8Array(this.buffer.length + chunk.length);
        newBuffer.set(this.buffer);
        newBuffer.set(chunk, this.buffer.length);
        this.buffer = newBuffer;

        const messages = [];

        while (this.buffer.length >= 16) { // Minimum message size is 16 bytes
            // Read total length (4 bytes)
            const totalLength = this.readInt32(0);

            if (this.buffer.length < totalLength) {
                console.log(this.buffer.length, totalLength);
                break; // Wait for more data
            }

            // Read headers length (4 bytes)
            const headersLength = this.readInt32(4);

            // Parse headers
            const headers = this.parseHeaders(12, headersLength);

            // Calculate payload start and length
            const payloadStart = 12 + headersLength;
            const payloadLength = totalLength - headersLength - 16; // 16 = prelude (8) + checksum (4) + message checksum (4)

            // Extract payload
            const payload = this.buffer.slice(payloadStart, payloadStart + payloadLength);

            // Create message object
            const message = {
                headers,
                payload: this.decodePayload(payload, headers)
            };

            messages.push(message);

            // Remove processed message from buffer
            this.buffer = this.buffer.slice(totalLength);
        }

        return messages;
    }

    /**
     * Read a 32-bit integer from the buffer
     */
    readInt32(offset) {
        return (this.buffer[offset] << 24) |
            (this.buffer[offset + 1] << 16) |
            (this.buffer[offset + 2] << 8) |
            this.buffer[offset + 3];
    }

    /**
     * Parse headers from the buffer
     */
    parseHeaders(start, length) {
        const headers = {};
        let position = start;
        const end = start + length;

        while (position < end) {
            // Read header name length (1 byte)
            const nameLength = this.buffer[position++];

            // Read header name
            const name = new TextDecoder().decode(
                this.buffer.slice(position, position + nameLength)
            );
            position += nameLength;

            // Read header value type (1 byte)
            const type = this.buffer[position++];

            // Read header value length (2 bytes)
            const valueLength = (this.buffer[position] << 8) | this.buffer[position + 1];
            position += 2;

            // Read header value
            const value = this.parseHeaderValue(
                type,
                this.buffer.slice(position, position + valueLength)
            );
            position += valueLength;

            headers[name] = value;
        }

        return headers;
    }

    /**
     * Parse header value based on type
     */
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
            case 5: // long
                // Note: JavaScript doesn't handle 64-bit integers well
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

    /**
     * Decode payload based on content-type header
     */
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
 * Every provider RETURNS a function that cancels the request it just started, for
 * the user who stops a chat mid-answer (llmchat.js `stopTurn`). Cancelling has to
 * reach the fetch itself and not merely stop reading its body: the model keeps
 * generating -- and the user keeps paying for it -- for as long as the connection
 * is open.
 *
 * A cancelled request still reports through `fail`, in every provider, so that
 * whoever aborted is released even if they hold a booking they have not let go of.
 * The report says the request was aborted, which is why the caller that DID mean to
 * abort has to drop it rather than show it (see `llmRequest` in start.js); the log
 * is the one thing an abort is spared, being a decision rather than a fault. The
 * function comes back even from the paths that never got as far as fetching, so
 * that whoever holds it never has to ask which kind of failure it was.
 */

/*
 * Guard a provider's callbacks so the caller is completed exactly once, whatever
 * route the request ends by: a normal stop, an error frame mid-stream, a malformed
 * chunk, a connection dropped without a terminator, an error body that is not a
 * stream at all, a fetch that never connected, or a fetch cancelled from the
 * outside.
 *
 * The caller books the shared `llmResponse` handler for the duration of a request,
 * and nothing but a completion releases it -- so a request that ends without one
 * holds that booking forever, which silently disables every LLM feature in that
 * frame until a reload. Every provider below therefore reports through `fail`
 * rather than calling `opts.onComplete` itself.
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
        fail: (msg) => {
            opts.onChunk(msg);
            complete({});
        },
        // whether the caller has been released, for a read loop deciding whether
        // there is anything left to wait for
        isDone: () => completed,
    };
}

let awsClient = null;
function bedrock(req, opts) {
    const abortCtrl = new AbortController();
    const { complete, fail, isDone } = completeOnce(opts);

    if (!awsClient) {
        /*
         * Names the three fields because `_registerLlmProviders` needs ALL of them
         * and says nothing when one is missing -- a config with the model line
         * commented out registers no client at all -- and mentions reloading because
         * the credentials come from snippets that run in a page: a background that
         * has never seen one since it started has nothing to build a client from.
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
            // `{type: "none"}` makes the model answer with what it has instead of
            // calling another tool. The declarations have to stay in the request
            // either way: the conversation carries tool_use/tool_result blocks by
            // then, and those are rejected when `tools` is absent.
            //
            // `none` is a recent addition to the anthropic API, so a model that
            // predates it answers such a round with an error instead. Only a caller
            // that has decided the tool calling is over ever sends it.
            "tool_choice": req.tool_choice,
            "system": req.messages[0].content,
            "messages": transformMessages(req.messages.slice(1))
        })
    }).then(response => {
        const reader = response.body.getReader();

        let content_block = {};
        let message = {};

        /*
         * A tool call with no arguments is streamed as a tool_use block with NO
         * input_json_delta events at all, so the accumulator is still "" here --
         * JSON.parse("") would throw "Unexpected end of JSON input" and, being
         * inside the reader promise, take the whole stream down with it.
         */
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
                    // Keep every block type, not just text and tool_use: leaving a
                    // stale block here would make content_block_stop push the
                    // previous one a second time, and re-parse an input it already
                    // consumed.
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
                    // the stream ended without message_stop, e.g. the connection
                    // dropped: the caller still has to be released
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
                // Continue reading
                readStream();
            }).catch(error => {
                // a malformed event would otherwise reject unobserved: this chain
                // is not returned to the outer promise, so its .catch never sees it
                fail(`Error: ${error.message}`);
            });
        }

        if (response.status == 200) {
            readStream();
        } else {
            // an error body is not an event stream, so it is read as text -- and a
            // read that rejects still has to release the caller
            reader.read().then(({done, value}) => {
                fail(value ? new TextDecoder().decode(value) : `Error ${response.status}: no response body`);
            }).catch(error => fail(`Error ${response.status}: ${error.message}`));
        }
    }).catch(error => {
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

    fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        signal: abortCtrl.signal,
        body: JSON.stringify({
            "model": ollama.model || 'qwen2.5-coder:32b',
            "tools": req.tools,
            // "answer with what you have, call nothing else", from a caller that has
            // decided the tool calling is over. Ollama's own /api/chat does not
            // document `tool_choice` -- it is forwarded in case the server honours
            // it, and ignored otherwise, so nothing may depend on it being obeyed.
            "tool_choice": req.tool_choice,
            "messages": req.messages
        })
    }).then(response => {
        const reader = response.body.getReader();

        let toolCalls = [];
        let content = "";
        function readStream() {
            reader.read().then(({done, value}) => {
                if (done) {
                    // the stream ended without a `done` line, e.g. ollama was shut
                    // down mid-answer: the caller still has to be released
                    if (!isDone()) {
                        fail("\n\n**Warning:** the response ended unexpectedly.");
                    }
                    return;
                }

                // Convert the chunk to text
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
                            // `content` already holds every delta of this final
                            // message too, so it is the whole answer on its own
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

                // Continue reading
                readStream();
            }).catch(error => {
                // a malformed chunk would otherwise reject unobserved: this chain
                // is not returned to the outer promise, so its .catch never sees it
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

    /*
     * Content is a plain string in this shape, while the frontend may hold it as the
     * block array the anthropic shape uses. EVERY text block is joined, not just the
     * first: a conversation carried over from another provider has its turns folded
     * together, so one turn can hold what the model said before and after a tool
     * call, and keeping only block 0 would drop the answer while still showing it on
     * screen. Non-text blocks are the other provider's tool bookkeeping and have no
     * meaning here.
     *
     * `tool_calls` and `tool_call_id` have to survive too: a conversation that has
     * called a tool is replayed on every following request, and a provider rejects
     * one where a tool message does not name the call it answers.
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
            // "none" makes the model answer with what it has instead of calling
            // another tool, while leaving the declarations the earlier turns of this
            // conversation refer to in place
            tool_choice: req.tool_choice,
            messages: transformMessages(req.messages),
        }),
        signal: abortCtrl.signal,
    })
        .then(resp => {
            const reader = resp.body.getReader();
            let contentBlock = { type: 'text', text: '' };
            let fullContent = '';
            let emittedLen = 0;
            let afterThink = false;

            if (resp.status !== 200) {
                // an error body is not an SSE stream, so the loop below would find no
                // `data:` line and end with nobody released
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

            /*
             * A tool call is streamed in fragments, keyed by `index`: the id and the
             * name may arrive in one delta and the arguments over many, so each slot
             * is accumulated rather than replaced.
             */
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
                    // the tool result is keyed by this id, so a provider that streamed
                    // none is given one rather than a conversation it cannot answer
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
                        // an abort is reported too, so the caller is released
                        // whatever ends the request; only the log is spared, since
                        // a cancellation is not a fault to investigate
                        if (err.name !== 'AbortError') {
                            console.error('Stream error:', err);
                        }
                        fail(`Error: ${err.message}`);
                    });
            };

            readStream();
        })
        .catch(err => {
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
