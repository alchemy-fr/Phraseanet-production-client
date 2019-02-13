/**
 * WEBPACK CONFIG
 *
 */
/* eslint-disable no-var */
require('babel-core/register');

// Webpack config for development

const webpack = require('webpack');
const path = require('path');
const pkg = require('../../package.json');
// const banner = require('../banner');
const WebpackNotifierPlugin = require('webpack-notifier');
const config = require('../config');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

// add loader for external stylesheets:
var extractCSS = new ExtractTextPlugin('[name].css', {
    allChunks: true
});
module.exports = {
    // entry points
    entry: {
        production: config.sourceDir + 'prod/index.js',
        lightbox: config.sourceDir + 'lightbox/index.js',
        'lightbox-mobile': config.sourceDir + 'lightbox-mobile/index.js',
        permaview: config.sourceDir + 'permaview/index.js',
        authenticate: [config.sourceDir + 'authenticate/index.js'],
        account: [config.sourceDir + 'account/index.js'],
        commons: [config.sourceDir + 'common/index.js'],
        'skin-000000': [config.sourceDir + 'skins/skin-000000.js'],
        'skin-959595': [config.sourceDir + 'skins/skin-959595.js'],
        'skin-FFFFFF': [config.sourceDir + 'skins/skin-FFFFFF.js']
    },
    cache: true,
    debug: true,
    watch: true,
    devtool: 'eval',
    output: {
        path: config.distDir,
        filename: '[name].js',
        chunkFilename: 'lazy-[name].js',
        libraryTarget: 'umd',
        library: config._app,
        publicPath: '/assets/production/'
    },
    module: {
        preLoaders: [{
            test: /\.js$/,
            loader: 'eslint-loader',
            exclude: /node_modules/,
            include: path.join(__dirname, '../../src')
        }],
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules\/(?!phraseanet-common)/,
            loader: 'babel',
            query: {
                presets: ['es2015', 'stage-0']
            }
        }, {
            test: /\.(woff|png|jpg|gif|svg)$/,
            loader: 'url-loader?limit=10000&prefix=img/&name=[path][name].[ext]?[hash]'
        }, {
            test: /\.(png|jpg|jpeg|gif)$/,
            loader: 'file-loader'
        }, {
            test: /\.css$/,
            loader: 'style-loader!css-loader'
        },
        // exclude skins as inline-css in dev env
        // {
        //     test: /\.scss$/,
        //     exclude: /src\/skins\//,
        //     loaders: ['style', 'css', 'resolve-url', 'sass?sourceMap']
        // },
        // only skins are extracted as external file in dev env:
        // every css should be exported as file in dev env
        {
            test: /\.scss$/,
            // exclude: /src\/(?!skins)/,
            // include: [path.join(__dirname, '../../src'), path.join(__dirname, '../../stylesheets')],
            loader: ExtractTextPlugin.extract('css!resolve-url!sass', { publicPath: './'})
        },{
            test: require.resolve('jquery-lazyload'),
            loader: "imports?this=>window"
        }, {
            test: require.resolve('phraseanet-common/src/components/tooltip'),
            loader: "imports?this=>window"
        }, {
            test: require.resolve('phraseanet-common/src/components/vendors/contextMenu'),
            loader: "imports?this=>window"
        }, {
            test: require.resolve('geonames-server-jquery-plugin/jquery.geonames'),
            loader: "imports?this=>window"
        }, {
            test: require.resolve('bootstrap-multiselect'),
            loader: "imports?this=>window"
        }, {
            test: /\.json$/,
            loader: "json"
        }]
    },
    sassLoader: {
        sourceMap: true
    },
    resolve: {
        extensions: ['', '.js', '.css', '.scss']
    },
    plugins: [
        new WebpackNotifierPlugin({
            alwaysNotify: true
        }),

        new webpack.optimize.OccurenceOrderPlugin(),
        // new webpack.BannerPlugin(banner),
        new webpack.DefinePlugin({
            '__DEV__': true,
            'process.env.NODE_ENV': JSON.stringify('development'),
            VERSION: JSON.stringify(pkg.version)
        }),
        new webpack.optimize.CommonsChunkPlugin({
            name: 'commons',
            chunks: ['production', 'lightbox'],
            minChunks: 2
        }),
        extractCSS
        // i18next
    ],
    externals: {
        jquery: 'jQuery',
        ui: 'jQuery.ui'
    },
    eslint: {
        configFile: config.eslintDir
    }
};
