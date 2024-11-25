const HtmlWebpackPlugin = require('html-webpack-plugin');
const createElectronReloadWebpackPlugin = require('electron-reload-webpack-plugin');
const webpack = require('webpack');

// Create one plugin for both renderer and main process
const ElectronReloadWebpackPlugin = createElectronReloadWebpackPlugin({
    // Path to `package.json` file with main field set to main process file path, or just main process file path
    path: __dirname + '/build/main.js',
    // Other 'electron-connect' options
    logLevel: 0,
    stopOnClose: true,
});

module.exports = env=>{
    let production = false;
    if(typeof env === 'object' && env.production === true){
        production = true;
    }
    return [
        {
            mode: 'development',
            entry: './src/main.ts',
            target: 'electron-main',
            resolve: {
                extensions: ['.js', '.jsx', '.ts', '.tsx']
            },
            module: {
                rules: [{
                    test: /\.ts$/,
                    include: /src/,
                    use: [{ loader: 'ts-loader' }]
                },{
                    test: /\.(png|jpe?g|gif)$/i,
                    loader: 'file-loader',
                }]
            },
            output: {
                path: __dirname + '/build',
                filename: 'main.js'
            },
            plugins: [
                ElectronReloadWebpackPlugin()
            ],
            stats: production?'errors-only':'normal'
        },
        {
            mode: 'development',
            entry: './src/index.tsx',
            target: 'electron-renderer',
            devtool: 'source-map',
            resolve: {
                extensions: ['.js', '.jsx', '.ts', '.tsx']
            },
            module: {
                rules: [{
                    test: /\.ts(x?)$/,
                    include: /src/,
                    use: [{ loader: 'ts-loader' }]
                },{
                    test: /\.(png|jpe?g|gif|mp3)$/i,
                    loader: 'file-loader'
                }]
            },
            output: {
                path: __dirname + '/build',
                filename: 'index.js'
            },
            plugins: [
                new HtmlWebpackPlugin({
                    template: './src/index.html'
                }),
                new webpack.DefinePlugin({
                    '__REACT_DEVTOOLS_GLOBAL_HOOK__': '({ isDisabled: true })'
                }),
                ElectronReloadWebpackPlugin()
            ],
            stats: production?'errors-only':'normal'
        }
    ];
};