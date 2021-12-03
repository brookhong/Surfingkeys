import { RUNTIME } from '../content_scripts/common/runtime.js';
import {
    setSanitizedContent,
} from '../content_scripts/common/utils.js';
document.addEventListener("surfingkeys:defaultSettingsLoaded", function(evt) {
    const { normal, api } = evt.detail;

    const np  = new Promise((resolve, reject) => {
        import(/* webpackIgnore: true */ './neovim_lib.js').then((nvimlib) => {
            nvimlib.default().then(({nvim, destroy}) => {
                function rpc(data) {
                    const [ event, args ] = data;
                    if (event === "Enter") {
                        if (args.length) {
                            normal.feedkeys(args[0]);
                        } else {
                            document.body.classList.add("neovim-disabled");
                            normal.enter();
                        }
                    }
                }
                nvim.on('nvim:open', () => {
                    nvim.input('<Esc>');
                    nvim.on('surfingkeys:rpc', rpc);
                });
                nvim.on('nvim:close', () => {
                    window.close();
                });
                resolve(nvim);
            });
        });
    });
    np.then((nvim) => {
        RUNTIME('connectNative', {mode: "standalone"}, (resp) => {
            if (resp.error) {
                setSanitizedContent(document.querySelector('#overlay'), resp.error);
                document.body.classList.add("neovim-disabled");
            } else {
                normal.exit();
                api.mapkey('<Alt-i>', '', function() {
                    document.body.classList.remove("neovim-disabled");
                    normal.exit();
                });
                api.map('i', '<Alt-i>');
                nvim.connect(resp.url);
            }
        });
    });
});
