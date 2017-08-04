require('babel-core/register');

// Webpack config for creating the minified production bundle.

const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');
const WebpackNotifierPlugin = require('webpack-notifier');
const PKG_LOCATION = path.join(__dirname, '../../package.json');
const config = require('../config');
const webpackConfig = require('./webpack.production.config')
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

var extractCSS = new ExtractTextPlugin({
  filename: '[name].css',
  allChunks: true
});

module.exports = Object.assign({}, webpackConfig, {
    output: {
        path: config.distDir,
        filename: '[name].min.js',
        chunkFilename: 'lazy-[name].min.js',
        libraryTarget: 'umd',
        library: config._app,
        publicPath: '/assets/production/'
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "videojs": "video.js",
            "window.videojs": "video.js"
        }),
        // Notifier
        new WebpackNotifierPlugin({
            title: PKG_LOCATION.name,
            alwaysNotify: true
        }),
        // optimizations
        new webpack.NoErrorsPlugin(),
        new webpack.DefinePlugin({
            '__DEV__': false,
            'process.env.NODE_ENV': JSON.stringify('production'),
            VERSION: JSON.stringify(PKG_LOCATION.version)
        }),
        new webpack.optimize.CommonsChunkPlugin({
            name: 'commons',
            chunks: ['production', 'lightbox'],
            minChunks: 2
        }),
        extractCSS,
        new OptimizeCssAssetsPlugin({
            assetNameRegExp: /\.min\.css$/,
            cssProcessorOptions: { discardComments: { removeAll: true }, zindex: false }
        })
    ]
});
