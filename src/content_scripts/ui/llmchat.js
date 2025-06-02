import CursorPrompt from '../common/cursorPrompt';
import { marked } from 'marked';
import { RUNTIME, runtime } from '../common/runtime.js';
import {
    createElementWithContent,
    setSanitizedContent,
    rotateInput,
} from '../common/utils.js';

export default function (omnibar, front) {
    const self = {
        prompt: '🐝',
        omnibarPosition: "bottom",
    };

    const RESERVED_MESSAGE_COUNT = 1;
    let messages = [
        {
            "content": "",
            "role": "system"
        }
    ];
    let response = "";
    let provider = "";
    let providers = [];

    const dots = [ "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏" ];
    let spinnerIndex = 0;
    let spinnerInterval = 0;

    let userInput = "";
    let inputs = [];
    let curInputIdx = 0;

    const tools = [
        {
            "name": "extract_links",
            "input_schema": {
                "required": [
                    "pattern"
                ],
                "properties": {
                    "pattern": {
                        "description": "pattern that matches the text on the links",
                        "type": "string"
                    }
                },
                "type": "object"
            },
            "description": "extract/find links on the page"
        }
    ];
    const toolImplementations = {
        extract_links: (params) => {
            return 'https://github.com/brookhong/Surfingkeys, https://brookhong.github.io/';
        }
    };

    const providerClients = {
        "ollama": (resp) => {
            const toolResults = [];
            if (!resp.message.tool_calls) {
                return false;
            }
            for (const c of resp.message.tool_calls) {
                const toolResult = toolImplementations[c.function.name] ? toolImplementations[c.function.name](c.function.arguments) : `${c.function.name} not implemented.`;
                toolResults.push({
                    "content": toolResult,
                    "role": "tool"
                });
            }
            if (toolResults.length > 0) {
                messages.push(...toolResults);
                return true;
            }
            return false;
        },
        "bedrock": (resp) => {
            const toolResults = [];
            if (!resp.message.content) {
                return false;
            }
            for (const c of resp.message.content) {
                if (c.type === "tool_use") {
                    const toolResult = toolImplementations[c.name] ? toolImplementations[c.name](c.input) : "not implemented.";
                    toolResults.push({
                        "tool_use_id": c.id,
                        "is_error": false,
                        "content": toolResult,
                        "type": "tool_result"
                    });
                }
            }
            if (toolResults.length > 0) {
                messages.push({
                    "content": toolResults,
                    "role": "user"
                });
                return true;
            }
            return false;
        },
    };
    function llmRequest(req, onChunk) {
        // req.tools = tools;
        if (runtime.bookMessage('llmResponse', (resp) => {
            if (resp.chunk) {
                onChunk(resp.chunk);
            } else if (resp.done) {
                let toolUsed = false;
                if (Object.keys(resp.message).length > 0) {
                    messages.push(resp.message);
                    if (providerClients.hasOwnProperty(provider)) {
                        toolUsed = providerClients[provider](resp);
                    }
                }
                if (toolUsed) {
                    req.messages = messages;
                    RUNTIME("llmRequest", req);
                } else {
                    runtime.releaseMessage('llmResponse');
                }
            }
        })) {
            RUNTIME("llmRequest", req);
            return true;
        }
        return false;
    }

    function showSystemMessage(msg, duration) {
        const li = createElementWithContent('li', msg, { "class": "role-surfingkeys" });
        omnibar.resultsDiv.querySelector('ul')?.append(li);

        // Add fadeout animation after 3 seconds
        setTimeout(() => {
            li.style.transition = "opacity 1s";
            li.style.opacity = "0";
            li.addEventListener('transitionend', () => {
                li.remove();
            });
        }, duration);
    }

    const clear = () => {
        messages = messages.slice(0, RESERVED_MESSAGE_COUNT);
        omnibar.resultsDiv.querySelector('ul')?.remove();
        renderMessages();
    };
    const commands = {
        "system": (pmpt) => {
            messages[0].content = pmpt;
        },
        "provider": (p) => {
            if (providers.indexOf(p) !== -1) {
                clear();
                provider = p;
                omnibar.resultsDiv.querySelector('h4').textContent = p;
            } else {
                const msg = `Please specify a provider, which can be [ ${providers.join(", ")} ].`
                showSystemMessage(msg, 8000);
            }
        },
        "clearPromptHistory": () => {
            RUNTIME('updateInputHistory', {llmChat: []});
            inputs = [];
            curInputIdx = inputs.length;
        },
        "clear": clear,
    };
    const commandsPatten = new RegExp(`^/(${Object.keys(commands).join("|")})(?:\\s+(.+)|\\s*)?$`, "")
    const commandsPrompt = new CursorPrompt((c) => {
        return "<div>{0}</div>".format(c);
    }, (elm) => {
        return elm.innerText;
    });

    function renderMessages() {
        function getReadableContent(content) {
            if (typeof(content) === "string") {
                return content;
            } else {
                let readable = "";
                for (const c of content) {
                    if (c.type === "text") {
                        readable += c.text;
                    }
                }
                return readable;
            }
        }

        const readables = [];
        let currentRole = "";
        for (const m of messages.slice(RESERVED_MESSAGE_COUNT)) {
            const content = getReadableContent(m.content);
            if (content === "") {
                continue;
            }
            if (m.role === currentRole) {
                readables[readables.length - 1].content += content;
            } else {
                readables.push({
                    role: m.role,
                    content
                });
                currentRole = m.role;
            }
        }

        const ul = createElementWithContent('ul');
        for (const m of readables) {
            if (m.role === "user") {
                ul.append(createElementWithContent('li', m.content, { "class": `role-${m.role}` }));
            } else {
                const li = createElementWithContent('li', "<div></div>", { "class": `role-${m.role}` });
                setSanitizedContent(li.firstElementChild, marked.parse(m.content));
                ul.append(li);
            }
        }
        omnibar.resultsDiv.append(ul);
        if (ul.lastElementChild) {
            ul.lastElementChild.scrollIntoView({ behavior: 'instant', block: 'end', });
        }
    }

    self.onOpen = function(opts) {
        messages[0].content = opts && opts.system || "";
        omnibar.resultsDiv.className = "llmChat";
        if (!provider) {
            provider = opts && opts.provider || runtime.conf.defaultLLMProvider;
        }
        omnibar.resultsDiv.append(createElementWithContent('h4', provider));
        renderMessages();

        userInput = "";
        RUNTIME('getSettings', {
            key: 'llmChatHistory'
        }, function(resp) {
            inputs = resp.settings.llmChatHistory;
            curInputIdx = inputs.length;
        });
        RUNTIME('getAllLlmProviders', { }, function(resp) {
            providers = resp.providers;
        });

    };
    self.onInput = function() {
        userInput = omnibar.input.value;
        curInputIdx = inputs.length;
        if (userInput === "/") {
            commandsPrompt.activate(omnibar.input, Object.keys(commands));
        } else if (userInput[0] !== "/") {
            commandsPrompt.close();
        } else if (userInput === "/provider ") {
            commandsPrompt.activate(omnibar.input, providers);
        }
    };
    self.rotateInput = function(backward) {
        if (inputs.length > 0) {
            [omnibar.input.value, curInputIdx] = rotateInput(inputs, backward, curInputIdx, userInput);
        }
    };
    self.onClose = function() {
        omnibar.resultsDiv.className = "";
        commandsPrompt.close();
    };
    self.onTabKey = function() {
        const fi = omnibar.resultsDiv.querySelector('li.focused');
        if (fi.classList.contains("role-user")) {
            omnibar.input.value = fi.innerText;
        }
    };

    let lastResponseItem = null;
    self.onEnter = function() {
        const prompt = omnibar.input.value;
        if (!prompt) {
            return false;
        }

        RUNTIME('updateInputHistory', { llmChat: prompt }, (resp) => {
            inputs = resp.history;
            curInputIdx = inputs.length;
        });
        const match = prompt.match(commandsPatten);
        if (match) {
            commands[match[1]](match[2]);
            userInput = "";
            omnibar.input.value = "";
            return false;
        }

        if (messages[messages.length - 1].content !== prompt || messages[messages.length - 1].role !== "user") {
            messages.push({ "content": prompt, "role": "user"});
        }
        if (llmRequest({ messages, provider }, onChunk)) {
            userInput = "";
            omnibar.input.value = "";
            response = "";
            omnibar.resultsDiv.lastElementChild.append(createElementWithContent('li', prompt, { "class": "role-user" }));
            lastResponseItem = createElementWithContent('li', "<div></div>", { "class": "role-assistant" });
            omnibar.resultsDiv.lastElementChild.append(lastResponseItem);
            spinnerIndex = 0;
            lastResponseItem.firstElementChild.innerText = dots[spinnerIndex];
            spinnerInterval = setInterval(() => {
                spinnerIndex = (spinnerIndex + 1) % dots.length;
                lastResponseItem.firstElementChild.innerText = dots[spinnerIndex];
            }, 100);
        } else {
            const rejectedMsg = messages.pop();
            showSystemMessage(`Working on, be patient, rejecting: ${rejectedMsg.content}`, 2000);
        }
        return false;
    };

    function onChunk(chunk) {
        if (spinnerInterval) {
            clearInterval(spinnerInterval);
            spinnerInterval = 0;
        }
        response = response + chunk
        setSanitizedContent(lastResponseItem.firstElementChild, marked.parse(response));
        lastResponseItem.firstElementChild.scrollIntoView({ behavior: 'instant', block: 'end', });
    }

    return self;
};
