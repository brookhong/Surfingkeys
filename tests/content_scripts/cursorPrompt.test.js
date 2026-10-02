import CursorPrompt from '../../src/content_scripts/common/cursorPrompt.js';

jest.mock('../../src/content_scripts/common/utils.js', () => ({
    createElementWithContent: (tag, content, attrs) => {
        const el = globalThis.document.createElement(tag);
        if (content) {
            el.innerHTML = content;
        }
        Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
        return el;
    },
    setSanitizedContent: (el, str) => { el.innerHTML = str; },
    locateFocusNode: () => ({ top: 0, left: 0, height: 0 }),
    scrollIntoViewIfNeeded: () => {},
}));

// the mode stack is how the prompt takes the keys; what it offers to complete is
// decided before any of that
jest.mock('../../src/content_scripts/common/mode.js', () => {
    function Mode() {
        this.addEventListener = () => this;
        this.enter = () => {};
        this.exit = () => {};
    }
    Mode.handleMapKey = () => {};
    return { __esModule: true, default: Mode };
});

describe('cursorPrompt candidates', () => {
    let input;

    /*
     * `typed` is what the user types AFTER the prompt opens, which is what narrows the
     * list: the prompt takes its match start from the cursor it was activated at.
     *
     * Nothing is offered when the element is detached -- that is how the prompt shows
     * an empty list, and its children are whatever it last rendered.
     */
    const render = (data, maxItems, keyOf, typed) => {
        const prompt = new CursorPrompt((c) => `<div>${c}</div>`, (elm) => elm.innerText,
            undefined, { maxItems, keyOf });
        input.value = "/";
        input.setSelectionRange(1, 1);
        prompt.activate(input, data);
        if (typed) {
            input.value = `/${typed}`;
            input.setSelectionRange(input.value.length, input.value.length);
            prompt.onKeyUp({});
        }
        return prompt.element.isConnected
            ? Array.from(prompt.element.children).map((d) => d.textContent)
            : [];
    };

    beforeEach(() => {
        document.body.innerHTML = '<input id="input">';
        input = document.querySelector('#input');
    });

    /*
     * The list is drawn at the cursor with no height of its own, so it is bounded --
     * but a prompt completing a fixed menu asks for a bound that fits it. Cut one
     * entry off such a menu and that command cannot be found at all.
     */
    test('offers every candidate of a menu that fits the limit', () => {
        const commands = ['agents', 'clear', 'clearPromptHistory', 'copy', 'permissions', 'provider'];

        expect(render(commands, 12)).toEqual(commands);
    });

    test('stops at the limit for a list that does not fit', () => {
        expect(render(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3)).toEqual(['a', 'b', 'c']);
    });

    // the default suits a prompt filtering a large set, where five matches are already
    // a choice -- the emoji list is thousands of entries
    test('offers five without a limit of its own', () => {
        expect(render(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toHaveLength(5);
    });

    // a prompt wanting neither a limit nor a key of its own passes no options at all
    test('offers five with no options argument', () => {
        const prompt = new CursorPrompt((c) => `<div>${c}</div>`, (elm) => elm.innerText);
        input.value = "/";
        input.setSelectionRange(1, 1);
        prompt.activate(input, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);

        expect(prompt.element.children).toHaveLength(5);
    });

    /*
     * A candidate that carries more than what is completed -- a command and what it
     * does -- is still found by its name, so reading the menu does not change what
     * typing narrows it to.
     */
    describe('a candidate with text beside the completion', () => {
        const commands = ['clear\tempty this conversation', 'copy\tput it in the clipboard'];

        test('matches on the key alone', () => {
            const keyOf = (c) => c.split("\t")[0];

            expect(render(commands, 12, keyOf, 'c')).toHaveLength(2);
            expect(render(commands, 12, keyOf, 'clipboard')).toHaveLength(0);
        });

        // what an emoji is searched by is its name, which sits beside the codepoints
        // being completed
        test('matches the whole candidate without a key', () => {
            expect(render(commands, 12, undefined, 'clipboard')).toHaveLength(1);
        });
    });
});
