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

let awsClient = null;
function bedrock(req, opts) {
    if (!awsClient) {
        opts.onChunk("Please set up bedrock correctly.");
        opts.onComplete({});
        return;
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
        body: JSON.stringify({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "top_k": 250,
            "temperature": 1,
            "top_p": 0.999,
            "tools": req.tools,
            "system": req.messages[0].content,
            "messages": transformMessages(req.messages.slice(1))
        })
    }).then(response => {
        const reader = response.body.getReader();

        let content_block = {};
        let message = {};
        function readStream() {
            reader.read().then(({done, value}) => {
                if (done) {
                    return;
                }

                // Convert the chunk to text
                const messages = parser.parse(value);
                for (var m of messages) {
                    if (m.headers[":message-type"] === "exception") {
                        opts.onChunk(m.payload.message);
                        opts.onComplete({});
                    } else {
                        let e = JSON.parse(atob(m.payload.bytes));
                        switch (e.type) {
                            case "message_start":
                                message = { "role": e.message.role, "content": [] };
                                break;
                            case "content_block_start":
                                switch (e.content_block.type) {
                                    case "text":
                                        content_block = e.content_block;
                                        opts.onChunk(content_block.text);
                                        break;
                                    case "tool_use":
                                        content_block = e.content_block;
                                        content_block.input_json = "";
                                        break;
                                }
                                break;
                            case "content_block_delta":
                                switch (e.delta.type) {
                                    case "text_delta":
                                        opts.onChunk(e.delta.text);
                                        content_block.text += e.delta.text;
                                        break;
                                    case "input_json_delta":
                                        content_block.input_json += e.delta.partial_json
                                        break;
                                }
                                break;
                            case "content_block_stop":
                                if (content_block.type === "tool_use") {
                                    content_block.input = JSON.parse(content_block.input_json);
                                    delete content_block.input_json;
                                }
                                message.content.push(content_block);
                                break;
                            case "message_stop":
                                opts.onComplete(message);
                                break;
                        }
                    }
                }

                // Continue reading
                readStream();
            });
        }

        if (response.status == 200) {
            readStream();
        } else {
            reader.read().then(({done, value}) => {
                const err = new TextDecoder().decode(value);
                opts.onChunk(err);
                opts.onComplete({});
            });
        }
    }).catch(error => console.error('Error:', error));
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

    fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        body: JSON.stringify({
            "model": ollama.model || 'qwen2.5-coder:32b',
            "tools": req.tools,
            "messages": req.messages
        })
    }).then(response => {
        const reader = response.body.getReader();

        let toolCalls = [];
        let content = "";
        function readStream() {
            reader.read().then(({done, value}) => {
                if (done) {
                    return;
                }

                // Convert the chunk to text
                try {
                    const chunk = decoder.decode(value).trim();
                    for (const c of chunk.split("\n")) {
                        const o = JSON.parse(c);
                        if (o.message.content) {
                            content += o.message.content;
                            opts.onChunk(o.message.content);
                        }
                        if (o.message.tool_calls) {
                            toolCalls.push(...o.message.tool_calls);
                        }
                        if (o.done) {
                            o.message.content = o.message.content + content;
                            o.message.tool_calls = toolCalls;
                            opts.onComplete(o.message);
                        }
                    }
                } catch (e) {
                    console.error('Error in onChunk:', e, value);
                }

                // Continue reading
                readStream();
            });
        }

        if (response.status == 403) {
            opts.onChunk("403 Forbidden, please restart Ollama with `OLLAMA_ORIGINS=chrome-extension://*`.");
            opts.onComplete({});
        } else {
            readStream();
        }
    }).catch(error => console.error('Error:', error));
}

function deepseek(req, opts) {
    const decoder = new TextDecoder();
    if (!deepseek.apiKey) {
        opts.onChunk("Please set api key for DeepSeek correctly.");
        opts.onComplete({});
        return;
    }

    function transformMessages(reqMsgs) {
        return reqMsgs.map((m) => {
            if (typeof(m.content) === "string") {
                return m;
            } else {
                return {"role": m.role, "content": m.content[0].text};
            }
        });
    }
    fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${deepseek.apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            "model": deepseek.model || 'deepseek-chat',
            "stream": true,
            "messages": transformMessages(req.messages)
        })
    }).then(response => {
        const reader = response.body.getReader();

        let content_block = { type: "text", text: "" };
        function readStream() {
            reader.read().then(({done, value}) => {
                if (done) {
                    return;
                }

                // Convert the chunk to text
                const chunk = decoder.decode(value);
                try {
                    const lines = chunk.trim().split("\n\n");
                    const dataPat = /^data: /;
                    for (const line of lines) {
                        if (!dataPat.test(line)) {
                            console.error('Unexpected line: ', line);
                            continue;
                        }
                        const data = line.replace(dataPat, "");
                        if (data === "[DONE]") {
                            opts.onComplete({role: "assistant", content: [content_block]});
                            return;
                        }
                        const o = JSON.parse(data);
                        if (o.choices && o.choices[0].delta) {
                            opts.onChunk(o.choices[0].delta.content);
                            content_block.text += o.choices[0].delta.content;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing chunk:', e, value);
                }

                // Continue reading
                readStream();
            });
        }

        readStream();
    }).catch(error => console.error('Error:', error));
}

// https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
function gemini(req, opts) {
    const decoder = new TextDecoder();
    if (!gemini.apiKey) {
        opts.onChunk("Please set api key for Gemini correctly.");
        opts.onComplete({});
        return;
    }

    let model = opts.model || "gemini-2.0-flash";
    function buildParts(m) {
        if (typeof(m.content) === "string") {
            return {"role": m.role, "parts": [ {"text": m.content} ]}
        } else {
            return {"role": m.role, "parts": [ {"text": m.content[0].text} ]}
        }
    }
    function transformMessages(reqMsgs) {
        let req = {};
        if (reqMsgs.length > 0 && reqMsgs[0].role === "system") {
            const text = reqMsgs[0].content;
            req.systemInstruction = { "parts": [ { text } ] };
            req.contents = reqMsgs.slice(1).map(buildParts);
        } else {
            req.contents = reqMsgs.map(buildParts);
        }
        return req;
    }

    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${gemini.apiKey}`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(transformMessages(req.messages))
    }).then(response => {
        const reader = response.body.getReader();

        let buffer = "";
        let content_block = { type: "text", text: "" };
        function readStream() {
            reader.read().then(({done, value}) => {
                if (done) {
                    return;
                }

                // Convert the chunk to text
                const chunk = decoder.decode(value);
                try {
                    buffer += chunk;
                    if (buffer[0] !== "[") {
                        return readStream();
                    }
                    if (buffer[buffer.length - 1] === "]") {
                        const messages = JSON.parse(buffer);
                        for (const o of messages) {
                            if (o.error && o.error.message) {
                                opts.onChunk(o.error.message);
                                opts.onComplete({});
                                return;
                            }
                            if (o.candidates) {
                                if (o.candidates[0].content) {
                                    opts.onChunk(o.candidates[0].content.parts[0].text);
                                    content_block.text += o.candidates[0].content.parts[0].text;
                                }
                                if (o.candidates[0].finishReason && o.candidates[0].finishReason === "STOP") {
                                    opts.onComplete({role: "assistant", content: [content_block]});
                                }
                            }
                        }
                        buffer = "";
                    }
                } catch (e) {
                    console.error('Error parsing chunk:', e, value);
                }

                // Continue reading
                readStream();
            });
        }

        readStream();
    }).catch(error => console.error('Error:', error));
}

function custom(req, opts) {
    const decoder = new TextDecoder();
    const abortCtrl = new AbortController();

    if (!custom.serviceUrl) {
        opts.onChunk('Please set service URL correctly.');
        opts.onComplete({});
        return;
    }
    if (!custom.apiKey) {
        opts.onChunk('Please set API key correctly.');
        opts.onComplete({});
        return;
    }
    if (!custom.model) {
        opts.onChunk('Please set model correctly.');
        opts.onComplete({});
        return;
    }

    const transformMessages = msgs => msgs.map(m =>
        typeof m.content === 'string' ? m : { role: m.role, content: m.content[0].text }
    );

    fetch(custom.serviceUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${custom.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: custom.model,
            stream: true,
            messages: transformMessages(req.messages),
        }),
        signal: abortCtrl.signal,
    })
        .then(resp => {
            const reader = resp.body.getReader();
            let contentBlock = { type: 'text', text: '' };

            const readStream = () => {
                reader.read()
                    .then(({ done, value }) => {
                        if (done) {
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
                                    opts.onComplete({ role: 'assistant', content: [contentBlock] });
                                    return;
                                }
                                const o = JSON.parse(data);
                                if (o.choices?.[0]?.delta?.content) {
                                    const txt = o.choices[0].delta.content;
                                    opts.onChunk(txt);
                                    contentBlock.text += txt;
                                }
                            }
                        } catch (e) {
                            console.error('Error parsing chunk:', e);
                        }

                        readStream();
                    })
                    .catch(err => {
                        if (err.name !== 'AbortError') {
                            console.error('Stream error:', err);
                        }
                    });
            };

            readStream();
        })
        .catch(err => {
            if (err.name !== 'AbortError') {
                console.error('Fetch error:', err);
            }
        });

    return () => abortCtrl.abort();
}

export default {
    bedrock,
    deepseek,
    gemini,
    ollama,
    custom,
}
