const path = require('path');
const package = require('../package.json');
let buildPath = path.resolve(__dirname, '../dist/');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

function modifyManifest(browser, mode, buffer) {
    // copy-webpack-plugin passes a buffer
    var manifest = JSON.parse(buffer.toString());

    // make any modifications you like, such as
    manifest.version = package.version;

    if (browser === "firefox") {
        manifest.options_ui = {
            page: "pages/options.html"
        };
        manifest.content_security_policy = "script-src 'self'; object-src 'self'";
        manifest.permissions.push("cookies",
            "contextualIdentities");
    } else {
        manifest.permissions.push("tts");
        manifest.permissions.push("downloads.shelf");
        manifest.background.persistent = true;
        manifest.incognito = "split";
        manifest.options_page = "pages/options.html";

        if (mode === "development") {
            manifest.key = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAneIRqYRqG/0RoYzpWoyeeO8KxxvWZvIabABbeQyHQ2PFOf81j/O5J28HGAEQJ56AptKMTcTeG2qZga9B2u9k98OmRcGp8BDco6fh1vD6/x0fWfehPeub5IcEcQmCd1lBuVa8AtUqV3C+He5rS4g8dB8g8GRlSPPSiDSVNMv+iwKAk7TbM3TKz6DyFO8eCtWXr6wJCcYeJA+Mub7o8DKIHKgv8XH8+GbJGjeeIUBU7mlGlyS7ivdsG1V6D2/Ldx0O1e6sRn7f9jiC4Xy1N+zgZ7BshYbnlbwedomg1d5kuo5m4rS+8BgTchPPkhkvEs62MI4e+fmQd0oGgs7PtMSrTwIDAQAb";
        }
    }

    // pretty print to JSON with two spaces
    manifest_JSON = JSON.stringify(manifest, null, 2);
    return manifest_JSON;
}

module.exports = (env, argv) => {
    const mode = argv.mode;
    const browser = env.browser ? env.browser : 'chrome';
    buildPath += "/" + browser;
    const entry = {
        background: `./src/background/${browser}.js`,
        content: `./src/content_scripts/${browser}.js`,
        'pages/frontend': `./src/content_scripts/ui/frontend.js`,
        'pages/options': './src/content_scripts/options.js',
        'pages/start': './src/content_scripts/start.js',
        'pages/ace': './src/content_scripts/ace.js',
    };
    const pagesCopyOptions = {
        ignore: [
            '**/neovim.*',
            '**/pdf_viewer.html',
        ]
    };
    if (browser === "chrome") {
        pagesCopyOptions.ignore = [];
        entry['pages/neovim'] = './src/pages/neovim.js';
        entry['pages/pdf_viewer'] = './src/content_scripts/pdf_viewer.js';
    }
    if (browser !== "safari") {
        entry['pages/markdown'] = './src/content_scripts/markdown.js';
    } else {
        pagesCopyOptions.ignore.push('**/markdown.html');
        pagesCopyOptions.ignore.push('**/donation.png');
    }
    console.log(pagesCopyOptions);

    const modules = [{
        devtool: false,
        output: {
            path: buildPath,
            filename: '[name].js',
        },
        resolve: {
            extensions: ['.ts', '.js'],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    loader: 'ts-loader',
                },
                {
                    test: /\.css$/,
                    use: [
                        { loader: "style-loader", options: { injectType: "linkTag" } },
                        { loader: "file-loader" },
                    ]
                },
                {
                    test: /purify.js/,
                    use: [
                        {
                            loader: 'string-replace-loader',
                            options: {
                                search: '//# sourceMappingURL=purify.js.map',
                                replace: ''
                            }
                        }
                    ]
                },
            ],
        },
        target: 'web',
        entry: entry,
        optimization: {
            minimizer: [new TerserPlugin({
                extractComments: false,
            })],
        },
        plugins: [
            new CopyWebpackPlugin({
                patterns: [
                    { from: 'src/pages', to: 'pages', globOptions: pagesCopyOptions },
                    { from: 'src/content_scripts/ui/frontend.html', to: 'pages' },
                    { from: 'src/content_scripts/ui/frontend.css', to: 'pages' },
                    { from: 'node_modules/ace-builds/src-noconflict/worker-javascript.js', to: 'pages' },
                    { from: 'src/icons', to: 'icons' },
                    { from: 'src/content_scripts/content.css', to: 'content.css' },
                    {
                        from: "src/manifest.json",
                        to:   ".",
                        transform (content, path) {
                            return modifyManifest(browser, mode, content)
                        }
                    }
                ]
            })
        ]
    }];
    if (browser !== "safari") {
        modules[0].plugins.push(
            new FileManagerPlugin({
                events: {
                    onEnd: {
                        archive: [
                            {
                                source: buildPath,
                                destination: `${buildPath}/sk.zip`
                            },
                        ],
                    },
                },
            })
        );
    }
    if (browser === "chrome") {
        modules.push({
            devtool: false,
            output: {
                path: buildPath,
                filename: '[name].js',
                libraryTarget: 'module',
            },
            resolve: {
                extensions: ['.ts', '.js'],
            },
            target: 'web',
            entry: {
                'pages/neovim_lib': './src/nvim/renderer.ts',
            },
            module: {
                rules: [
                    {
                        test: /\.ts$/,
                        exclude: /node_modules/,
                        loader: 'ts-loader',
                    },
                    {
                        test: /\.css$/,
                        use: [
                            { loader: "style-loader", options: { injectType: "linkTag" } },
                            { loader: "file-loader" },
                        ]
                    },
                ],
            },
            optimization: {
                minimizer: [new TerserPlugin({
                    extractComments: false,
                })],
            },
            experiments: {
                outputModule: true,
            }
        });
    }
    return modules;
};
