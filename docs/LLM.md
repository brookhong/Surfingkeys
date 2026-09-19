# Chat with LLM

[← back to README](../README.md)

### TABLE OF CONTENTS

* [Correct grammar of the input with LLM](#correct-grammar-of-the-input-with-llm)
* [Browser tools available to the LLM](#browser-tools-available-to-the-llm)
  * [Every tool call asks first](#every-tool-call-asks-first)
* [To use LLM chat with a specified system prompt](#to-use-llm-chat-with-a-specified-system-prompt)
* [403 Forbidden with Ollama](#403-forbidden-with-ollama)

Press `A` to open a chat popup and talk to an AI provider. The current page is not sent unless the model asks for it with the `read_page` tool. Supported providers:

* Ollama
* Bedrock
* Custom (any OpenAI-compatible API — SiliconFlow, OpenRouter, DeepSeek, Gemini, etc.)

Set up credentials first:

    settings.defaultLLMProvider = "bedrock";
    settings.llm = {
        bedrock: {
            accessKeyId: '********************',
            secretAccessKey: '****************************************',
            model: 'global.anthropic.claude-opus-4-8',
        },
        ollama: {
            model: 'qwen2.5-coder:32b',
        },
        custom: {
            siliconflow: {
                serviceUrl: 'https://api.siliconflow.cn/v1/chat/completions',
                apiKey: '***********************************',
                model: 'deepseek-ai/DeepSeek-V3.1',
            },
            openrouter: {
                serviceUrl: 'https://openrouter.ai/api/v1/chat/completions',
                apiKey: '***********************************',
                model: 'meta-llama/llama-3.1-70b-instruct:free',
            },
            deepseek: {
                serviceUrl: 'https://api.deepseek.com/chat/completions',
                apiKey: '***********************************',
                model: 'deepseek-chat',
            },
            gemini: {
                serviceUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
                apiKey: '***********************************',
                model: 'gemini-2.0-flash',
            },
        }
    };

Other ways to start a chat:

* **Visual mode** — `v`/`V` then `v` to select text, then `A` to chat about the selection.
* **Regional Hints** — `L` to pick an element, then `l`.

A conversation is kept per site and resumes when you return or reload. `/clear` starts a fresh one and revokes any tool permissions granted on that site. Switching provider mid-conversation keeps the Q&A but drops prior tool results.

`/copy` copies the conversation as Markdown, including a line for every tool call made (even denied ones).

## Correct grammar of the input with LLM

In insert mode, press `Ctrl-g` to send the current input's text to the LLM and replace it with the corrected version.

## Browser tools available to the LLM

The model can use these instead of guessing; it decides on its own when a tool is needed, and the chat shows which one is running.

Read-only tools:

| Tool | What it does |
| --- | --- |
| `read_page` | read the current page, or just the part you picked |
| `page_outline` | outline of a long page, to jump to the right section |
| `search_page` | find a mention on the page without reading all of it |
| `list_page_links` | list the links on the page |
| `search_browsing_history` | search your history |
| `search_bookmarks` | search your bookmarks |
| `list_recently_closed_tabs` | find a recently closed tab |
| `list_tabs` | list open tabs |
| `list_downloads` | list downloads (file names only, not paths) |
| `read_tab` | read another open tab, as the browser rendered it (signed in, scripts run) |
| `fetch_url` | fetch a URL directly (no session, no scripts) — for links the page merely references |

If `fetch_url` returns nothing usable (login wall, JS app shell), the model can fall back to `open_url` + `read_tab` to read it as a real tab instead.

Tools that change something (always confirmed — see below):

| Tool | What it does |
| --- | --- |
| `highlight_on_page` | highlight and scroll to a passage |
| `open_url` | open a URL in a background tab |
| `group_tabs` | group open tabs under a name |

Tabs the chat opens are collected into one tab group named **LLM** per window, and a tab is reused once the model is done reading its page — so comparing several pages doesn't pile up tabs. `settings.llmMaxTabs` caps how many tabs the chat holds at once (default 5); past that, its oldest tab is recycled.

    settings.llmMaxTabs = 3;

Pages are handed to the model as Markdown rather than flat text, so links, tables, image alt text and forms survive instead of collapsing into unstructured prose:

    Compare [the token bucket](https://en.wikipedia.org/wiki/Token_bucket) with:

    | Algorithm | Burst | Memory |
    | --- | --- | --- |
    | Token bucket | yes | O(1) |

    ![A bucket filling at a fixed rate](https://example.com/img/bucket.svg)

    [form POST https://example.com/subscribe]
    [email name=email label="Email" required]
    [button caption="Subscribe"]

Hidden and password field values are never included (only their names); content hidden with CSS is left out; a long page may take a second `read_page` call, and the result tells the model how to continue.

Tool calling works with every provider, but a small local model may ignore tools or pass poor arguments. A question gets 5 tool-call rounds (a tool that changes something costs 2, up to 12 total); past that the model is asked to answer with what it has.

### Every tool call asks first

Every tool call is confirmed before it runs, showing the tool and its exact arguments — a page's own text can be addressed to the model, and some tools send data out:

    🔐 search_browsing_history wants to read your browsing history and send the matches to the LLM provider.
       query: rust async
       y allow once · a allow for this chat · s allow on https://news.example.com · n deny

* `y` — allow once
* `a` — stop asking for this tool for the rest of the conversation
* `s` — stop asking for this tool on this site (scoped by origin), until revoked
* `n` / `Esc` — deny (the model is told and answers with what it already has)

Grants persist across restarts and apply in every open tab of that site immediately. `/clear` revokes grants for the current site along with its conversation; `/permissions` lists every grant across all sites, and `/permissions clear` revokes all of them.

To stop being asked about tools you trust:

    settings.llmAllowedTools = ["read_page", "list_tabs", "fetch_url"];

Default is `["read_page", "search_page", "list_page_links"]`. Think twice before adding `read_tab` (can expose a tab you're not looking at) or `fetch_url` (sends a model-chosen URL).

Tools that **change** something (`open_url`, `group_tabs`) are always confirmed — `llmAllowedTools` and `a` don't apply to them. Their only standing grant is `s`, which reads "allow any call on `<origin>`" since the arguments (which URL, which tabs) are the decision each time:

    🔐 group_tabs wants to put 3 tabs: "Inbox", "Pull requests", "CI — build #4821" into a tab group named "work".
       tabIds: [7,12,19]
       title: work
       y allow once · s allow any call on https://github.com · n deny

## To use LLM chat with a specified system prompt

For example, to make your AI a translator:

    api.mapkey('A', '#8Open llm chat', function() {
        api.Front.openOmnibar({type: "LLMChat", extra: {
            system: "You're a translator, whenever you got a message in Chinese, please just translate it into English, and if you got a message in English, please translate it to Chinese. You don't need to answer any question, just TRANSLATE."
        }});
    });

`extra.system` replaces the built-in system prompt entirely, including the note that pages are untrusted data — add your own if the chat should still read pages safely. Tool behavior itself is unaffected.

## 403 Forbidden with Ollama

To use Ollama with the Chrome extension, run it with `OLLAMA_ORIGINS` set:

Windows:

    OLLAMA_ORIGINS=chrome-extension://* ollama serve

Mac:

    launchctl setenv OLLAMA_ORIGINS chrome-extension://gfbliohnnapiefjpjlpjnehglfpaknnc

Mac, for both Chrome and Firefox:

    launchctl setenv OLLAMA_ORIGINS "chrome-extension://gfbliohnnapiefjpjlpjnehglfpaknnc,moz-extension://*"
