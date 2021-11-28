const path = require('path');
const buildPath = path.resolve(__dirname, '../dist/testdata');

const CopyWebpackPlugin = require('copy-webpack-plugin');

function modifyMH(browser, mode, buffer) {
    // copy-webpack-plugin passes a buffer
    var manifest = JSON.parse(buffer.toString());

    manifest.path = path.resolve(__dirname, '../src/nvim/server/start_none.sh');

    // pretty print to JSON with two spaces
    manifest_JSON = JSON.stringify(manifest, null, 2);
    return manifest_JSON;
}

module.exports = (env, argv) => {
    const mode = argv.mode;
    const browser = env.browser ? env.browser : 'chrome';
    return {
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
            ],
        },
        target: ['web', 'es5'],
        entry: {
        },
        plugins: [
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: "src/nvim/server/NativeMessagingHosts/Surfingkeys.json",
                        to:   "./NativeMessagingHosts",
                        transform (content, path) {
                            return modifyMH(browser, mode, content)
                        }
                    }
                ]
            })
        ]
    }
};
