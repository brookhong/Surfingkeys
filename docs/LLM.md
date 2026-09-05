# Chat with LLM

[← back to README](../README.md)

### TABLE OF CONTENTS

* [Correct grammar of the input with LLM](#correct-grammar-of-the-input-with-llm)
* [Browser tools available to the LLM](#browser-tools-available-to-the-llm)
  * [Every tool call asks first](#every-tool-call-asks-first)
* [To use LLM chat with a specified system prompt](#to-use-llm-chat-with-a-specified-system-prompt)
* [403 Forbidden with Ollama](#403-forbidden-with-ollama)

There are several LLM providers integrated into Surfingkeys now. Use `A` to call out a chat popup and chat with your AI providers. The page you are on is not sent along with your question: the model reads it with the `read_page` tool when a question actually needs it, so a chat that never asks about the page never sends it anywhere. The supported LLM providers are currently:

* Ollama
* Bedrock
* Custom LLM provider (e.g.: SiliconFlow, OpenRouter, DeepSeek and Gemini; other OpenAI API compatible services should also work)

To use the feature, you need to set up your credentials/API keys first, like this:

    settings.defaultLLMProvider = "bedrock";
    settings.llm = {
        bedrock: {
            accessKeyId: '********************',
            secretAccessKey: '****************************************',
            // model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
            model: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
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

You can also use `A` in visual mode. Press `v` or `V` to enter visual mode, then `v` again to select the text you'd like to chat with AI about, then `A` to call out the LLM chat box. Now start chatting with AI about the selected text — `read_page` then returns only that selection, not the whole page, and a half-selected link is still a link.

A conversation is kept per site, so returning to any page of that site — or reloading — resumes where you left off. `/clear` starts a fresh one, and also withdraws the tool permissions granted from a confirmation prompt on that site (see below). A conversation you resume under a different provider than the one it was held with keeps its questions and answers, but not the tool results, which only the original provider can be given back.

`/copy` puts the conversation on the clipboard as Markdown, to paste into a ticket, a document or a message. What you can read is what you get: your questions, the answers, and the `⚙` line for every tool call inside the answer that made one — including the ones you denied, so a pasted answer never reads as if the model simply knew something it had to go and look up. An answer still being written is copied as far as it has got, rather than the copy quietly giving you less than the screen does.

Another solution to select the content to chat with AI about is Regional Hints mode. Press `L` to pick an element, then `l` to call out the LLM chat box.

## Correct grammar of the input with LLM

In insert mode, press `Ctrl-g` to send the text of the current input to the LLM. The input text is then replaced with the corrected version.

## Browser tools available to the LLM

While chatting, the LLM can look things up in your browser instead of guessing. It decides on its own when a tool is needed, and the chat shows which tool is running. Most of the tools only report:

| Tool | What the LLM can do with it |
| --- | --- |
| `read_page` | read the page you are looking at, or just the part you picked |
| `page_outline` | see what a long page covers, and read only the section that matters |
| `search_page` | find where something is mentioned on that page, without reading all of it |
| `list_page_links` | see where the page can take you, to follow one of its links |
| `search_browsing_history` | find a page you visited before, or answer questions about what you have been reading |
| `search_bookmarks` | search the pages you deliberately saved |
| `list_recently_closed_tabs` | find a page that was open a moment ago |
| `list_tabs` | see the tabs you have open right now |
| `list_downloads` | see what you saved, where it came from, and whether it finished |
| `read_tab` | read a page you already have open in another tab, as your browser rendered it |
| `fetch_url` | read another page, to follow a link or check a fact the current page only references |

So you can ask things like *"summarize this"*, *"which of my open tabs covers authentication?"*, *"what does this page say about rate limits?"*, *"reopen the tab I just closed about Rust"*, *"find the Rust article I read last week and summarize it"*, *"compare the docs in my other tab with this one"*, or *"open the first link on this page and compare it with what I'm reading"*.

A few tools **change** something instead of reporting on it, so that an answer can be acted on rather than only read:

| Tool | What the LLM can do with it |
| --- | --- |
| `highlight_on_page` | highlight the passage an answer rests on and scroll to it, so you can see where it came from |
| `open_url` | open a page in a background tab, for you to look at when you are done — or for `read_tab` to read |
| `group_tabs` | collect open tabs into one named tab group |

So *"where does it say that?"* highlights the sentence on the page (`n` walks the other matches, `Esc` clears them), *"open the changelog it links to"* leaves a tab waiting for you, and *"tidy my GitHub tabs into a group"* does it. These three never touch the page you are on and never close anything: `open_url` opens in the background on purpose, because navigating or switching away would take the chat down with it, and a tab group only collects tabs you already have open — drag one out to undo it. **Every call of them is confirmed, and no setting can waive that** — the only thing that can is the `s` you press on the prompt itself, which allows the tool on one site until you take it back — see below.

`page_outline`, `search_page` and `list_page_links` exist so that a question about one detail of a long page does not cost a full read of it: each returns a short list, and `search_page` gives the character offset that makes the `read_page` after it land on the answer rather than at the top. `list_page_links` reads the converter's own output back, which is exact rather than approximate — every unescaped bracket in that text is one the converter wrote, so a link it reports is a link the page really contains, and a page that merely prints `[docs](https://evil.example)` in its text has none.

`list_downloads` reports the name of each file, not the path to it: that path names your account and home directory, and this is on its way to a third party. Ask where a file was saved and the model can request the full path, which the confirmation prompt then says it is doing.

There are two ways to read a page that is not the one you are on, and they are not interchangeable. `read_tab` takes a tab id — one `list_tabs` reported, or the one `open_url` reports for the tab it just opened — and reads that tab where it stands — the page as *your browser* rendered it, after its scripts ran and with you signed in, so a single-page app has its content and a page behind a login is the page you see. `fetch_url` makes a fresh request from the extension instead: no scripts run, no images are downloaded and your session is not part of it, which is what lets it read a page you never opened — a link from this page, from your history or from your bookmarks — and what makes it report little more than "probably rendered by JavaScript" for an app. So *"compare this with the spec in my other tab"* is `read_tab`, and *"check what the changelog it links to says"* is `fetch_url`. `read_tab` is the one read tool that can hand over a page you are not looking at, which is why its confirmation prompt names the tab **and its host** — *"read the text of tab 7, "Inbox (12)" at mail.example.com"* is a decision you can make; *"read tab 7"* is not — and why it is not in the default allowlist. A tab the browser has unloaded to save memory holds no page at all, and Surfingkeys does not run in browser pages, the extension gallery or the PDF viewer, so the model is told to use `fetch_url` or to ask you to open the tab rather than inventing what it says.

When `fetch_url` comes back with nothing usable — an empty app shell, a login page, a request that failed — the result tells the model the way through rather than leaving it to report failure: `open_url` puts the address in a background tab and `read_tab` reads it there, rendered and signed in. `open_url` reports the id of the tab it opened, so that second step needs no `list_tabs` call in between — an id is checked against the tabs your browser actually has open, so one tool's id is as good as another's, and the model is not sent back for something it was just handed. That route opens a tab, so it is `open_url`'s own confirmation prompt that decides whether it happens, every time; the model is told to take it when *your* question needs that page, and never because a page or a fetched document asked to be opened. A tab a second old is usually still loading, so a reading of an unfinished page is deliberately not kept: the result says so and says to read the tab again rather than continuing at an offset into a page that has since grown.

A route that reaches pages by opening them is a route that leaves tabs behind, so the two tools that make it clean up after themselves. Every tab the chat opens joins one tab group, named **LLM** — one group per window, collapsed or closed in a single gesture rather than hunted for along the strip. And a tab whose page the model has read *to the end* is the tab the next `open_url` uses: it has served its purpose, so the next address goes into it instead of beside it, and a question that reads five pages costs one tab rather than five. "To the end" is what makes that free rather than a trade: a page arrives in chunks, each ending in the offset that continues it, and a tab taken away mid-page would leave the rest of it reachable nowhere at all — not in the tab, which now holds something else. So a half-read tab keeps its page, and the model is told which of the two states it is in, so it can finish a page to free the tab or leave it and keep the page.

That bounds nothing by itself, though — a model that reads a little of each page would hold every tab it ever opened — so there is a ceiling, `settings.llmMaxTabs`, five tabs by default:

    settings.llmMaxTabs = 3;

At the ceiling the next `open_url` takes the **oldest** of those tabs even mid-page, and says so, both in the prompt and to the model, which is told that the offsets it holds for that page are now void and that opening that address in a tab again — which recycles a tab in turn — is how to have the rest. It is pointed back at a tab rather than at the network on purpose: that page is known to render in one, having just been read from one, whereas `fetch_url` is either untried on it or is the door that sent it here. Nothing is permanently lost, so the ceiling costs a re-read rather than an answer; what it buys is that the strip has an end. The recycling goes round: a tab that has just been given a page is the newest of them, so it goes to the back of the queue, and the same tab is not taken twice in a row. Which of the two kinds of reuse is about to happen is in the prompt — *"open https://b.example/2 in background tab 5, replacing https://a.example/1 — the oldest page this chat opened, which it has NOT finished reading, because it is holding its limit of 5 tabs"* — so replacing a page is a thing you approve rather than discover, and if you would rather keep that tab, `n`, or close one of the others, or raise the number.

Only tabs the chat opened are ever reused: it identifies them by watching a tab appear, not by their address, so a tab of yours at the same URL is not one of them. And the ceiling never overrides whose tab it is — a tab you are looking at right now, or one you have navigated somewhere of your own, is not the chat's to take at any count, so when all of them are like that it opens one more and goes over the limit rather than pull a page out from under you. A tab you have taken over that way still *counts*, though, because it is on your strip and in that group only because the chat put it there: what the number bounds is the tabs the chat caused, not the ones it can still recycle. So the chat pays for it — as you claim its tabs, it has less room and starts taking back pages it opened more recently — and you never do.

None of this bookkeeping is meant to reach the answer. All of it — the ids, the group, which tab was reused for which page, and that a page went unfinished — is addressed to the model so that its next call is right, and every one of those results says outright that it is not to be repeated to you. That withholds nothing you would want: a page the model needs more of is a page it can read again, so the silence costs a re-read at most, never an answer built on less than the model could have had. What it tells you is that it opened the page you asked about; where you see the mechanics is the confirmation prompt, which is the moment it matters, and the tool line in the bubble, which is the record. Answer, not plumbing.

`read_page`, `read_tab` and `fetch_url` hand over the page as Markdown rather than as flat text, because flat text keeps the words and drops everything the words point at. A link becomes its label with no destination, an image contributes nothing however carefully its `alt` was written, a table collapses into one run-on line, and a form becomes a few stray captions with no hint of what submitting it would do — and the model cannot tell that any of it was withheld, so it guesses. As Markdown you get instead:

    Compare [the token bucket](https://en.wikipedia.org/wiki/Token_bucket) with:

    | Algorithm | Burst | Memory |
    | --- | --- | --- |
    | Token bucket | yes | O(1) |

    ![A bucket filling at a fixed rate](https://example.com/img/bucket.svg)

    [form POST https://example.com/subscribe]

    [email name=email label="Email" placeholder="you@example.com" required]

    [hidden field csrf_token]

    [select name=cadence] options: Weekly (selected) | Monthly

    [button caption="Subscribe"]

So *"what would this form send, and where?"* and *"open the second link in the table"* are answerable. Links are absolute, so the model can pass one straight to `fetch_url`; the value of a hidden field or a password is never included, only its name, since these are session tokens on their way to a third party; a `data:` image is named but not inlined; an `alt=""` image is dropped, which is what the empty attribute means; and anything a page hides with CSS is left out, as it is not what you are reading — that holds for a tab read with `read_tab` as much as for the page you are on, while a page fetched by `fetch_url` is never laid out, so there nothing can be measured as hidden and nothing is dropped on that ground. Brackets in the page's own text are escaped, so a page cannot print something that reads like a link or a form of its own and have the model take it for one. URLs do make the text longer, so a link-heavy page may take a second `read_page` call — the result says how much is left and which offset continues it.

Tool use works with every provider. The declarations are sent in the shape each one speaks: the Anthropic shape to Bedrock, and the OpenAI function-calling shape to the custom providers and to Ollama, whose own `/api/chat` accepts that same shape. Note that a small local model may ignore the tools or call them with poor arguments — this works best with a capable model, and a service whose model has no function calling at all will answer with an error.

A single question is allowed five tool rounds. On the fifth the model is asked to answer with what it has gathered instead of calling anything else. A call that changes something buys back the round it costs, up to twelve in all: reading costs one round per answer, while acting costs two, since the round after it is where the model checks what happened and tells you.

### Every tool call asks first

A tool call is not necessarily something you asked for. Whatever the page-reading tools return was written by whoever wrote that page, so the conversation contains text nobody in your browser wrote, and it may well be addressed to the model — and `fetch_url` takes a URL, which is also a way to send data out. So each call is confirmed before it runs, showing the tool, what it will do, and the arguments verbatim:

    🔐 search_browsing_history wants to read your browsing history and send the matches to the LLM provider.
       query: rust async
       y allow once · a allow for this chat · s allow on https://news.example.com · n deny

`y` allows that one call, `a` stops asking for that tool for the rest of the conversation, `n` denies it — a denial is reported back to the model, which then answers with what it already has. Any other unmodified key is ignored while the prompt is up, so a stray Enter cannot submit past it, but `Ctrl`/`Cmd` shortcuts still work if you want to copy a URL out before deciding. The choices are also clickable, since the chat input does not always have the keyboard. Read the arguments before approving — they are shown one per line, exactly as the model sent them, and a request to fetch an address on your own network is called out explicitly.

`s` stops asking for that tool on every URL of the site you are on, in every tab, until you take it back. The chat is rebuilt with each page you visit, so `a` lasts only until you follow a link — one question walked across a few pages of a site asks about the same tool once per page, and once more in the next tab. `s` is that decision made once instead. It is scoped to the **origin**, which is what the prompt names rather than saying "this site": `http://example.com` and `https://example.com` are two different sites to it, a subdomain is another one again, and a `file:` or `data:` page counts only as itself.

A grant is kept where the conversations are kept, so it is remembered across a restart of the browser and is read fresh on every call — grant a tool in one tab and the chat already open in another honours it, withdraw it anywhere and it stops in every tab at once.

Nothing expires a grant, so there are two ways to take one back. `/clear` withdraws what was granted on **the site you are on**, along with the conversation. `/permissions` lists every site you have granted something and what you granted it — from any page, which is the point, since the `s` worth reviewing is the one you pressed on a site you have not been back to — and `/permissions clear` withdraws all of them at once. Press `s` knowing that: on `fetch_url` or a write tool it is a decision that stands until you go and look for it.

The prompt arrives whenever the model decides it needs a tool, which may be in the middle of a sentence you are typing, so `y`/`a`/`s`/`n` do not count for a moment after it appears — a keystroke meant for the input cannot approve a call or grant a standing permission. `Esc` denies immediately, and is the key to reach for if a prompt takes you by surprise.

Page text arrives as a tool result, fenced and labelled as untrusted, and the model is told to report on it rather than obey it.

To stop being asked for tools you trust, list them:

    settings.llmAllowedTools = ["read_page", "list_tabs", "fetch_url"];

Anything not listed is still confirmed. The default is `["read_page", "search_page", "list_page_links"]`: reading the page you opened the chat on is the point of opening it there, and none of the three takes a destination, so they have nowhere to send anything — the latter two are served from the same snapshot as `read_page` and report strictly less of it, so asking about them while the whole page goes unasked would only teach you to approve without reading. Set it to `[]` to be asked about those too. `page_outline` and `highlight_on_page` are reasonable additions for the same reason: the first reports strictly less of the page than `read_page`, and the second sends nothing anywhere. `read_tab` and `fetch_url` are the two worth thinking twice about before listing: the first can hand over a page you are not looking at — your mail, your tickets — and the second takes a URL chosen per call by a model that has been reading text the page wrote, so a standing permission for it is a standing permission to send something somewhere.

A tool that CHANGES something — `open_url`, `group_tabs` — is asked about until you grant it a site. Listing it in `llmAllowedTools` has no effect and the prompt for it does not offer `a`, because a standing permission is a judgement made once about calls that have not happened yet: with these tools the arguments are the whole decision — which URL, which tabs — and they are chosen per call by a model that has been reading text the page wrote. So the prompt names the target rather than the tool, looking up what the ids mean first:

    🔐 group_tabs wants to put 3 tabs: "Inbox", "Pull requests", "CI — build #4821" into a tab group named "work".
       tabIds: [7,12,19]
       title: work
       y allow once · s allow any call on https://github.com · n deny

`s` is the one standing permission these accept, and it reads **allow any call** rather than "allow on", because the prompt above it describes the call in front of you while the grant covers the ones after it — arguments included. It is the only grant whose reach you choose with the same keystroke that makes it — one origin, the one the prompt names — and `/clear` on that site, or `/permissions clear` from anywhere, takes it back in every tab at once. A setting cannot stand in for it, and neither can `a`: those answer for sites you are not on, or before the model has shown what it does with the tool. Worth pressing for *"open each of these links"* on a site you are working through; worth thinking about first for `open_url`, since a URL is also a way to send something somewhere, and the model picks it after reading the page. Whatever you grant, the call still appears in the chat as a trace line — the prompt is what a granted call loses, not the record of it, and `/permissions` will still name the tool afterwards.

## To use LLM chat with a specified system prompt

For example, you can designate your AI to be a translator with the snippet below

    api.mapkey('A', '#8Open llm chat', function() {
        api.Front.openOmnibar({type: "LLMChat", extra: {
            system: "You're a translator, whenever you got a message in Chinese, please just translate it into English, and if you got a message in English, please translate it to Chinese. You don't need to answer any question, just TRANSLATE."
        }});
    });

`extra.system` replaces the built-in instructions entirely, including the ones about the page being untrusted data, so say what you need if the chat is still meant to read pages. It does not affect the tools: how they work and what to do when one comes back empty is carried by the tools themselves, so a custom prompt does not cost you that.

## 403 Forbidden with Ollama

To use Ollama with the Chrome extension, you need to run ollama with a modification on `OLLAMA_ORIGINS`:

Under Windows

    OLLAMA_ORIGINS=chrome-extension://* ollama serve

Under Mac

    launchctl setenv OLLAMA_ORIGINS chrome-extension://gfbliohnnapiefjpjlpjnehglfpaknnc

Under Mac for both Chrome and Firefox

    launchctl setenv OLLAMA_ORIGINS "chrome-extension://gfbliohnnapiefjpjlpjnehglfpaknnc,moz-extension://*"
