require('babel-core/register');
// Webpack config for creating the production bundle.

const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');
const WebpackNotifierPlugin = require('webpack-notifier');
const PKG_LOCATION = path.join(__dirname, '../../package.json');
const config = require('../config');
const webpackConfig = require('./webpack.development.config');
// add loader for external stylesheets:
var extractCSS = new ExtractTextPlugin('[name].css', {
    allChunks: true
});

module.exports = Object.assign({}, webpackConfig, {

    cache: false,
    debug: false,
    devtool: false,
    hot: false,
    build: true,
    watch: false,
    module: {
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
        //     loaders: ['style', 'css', 'resolve-url', 'sass']
        // },
        // only skins are extracted as external file in dev env:
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
        // sourceMaps must be enabled in order to keep resolveUrl informations
        sourceMap: true
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        }),
        // Notifier
        new WebpackNotifierPlugin({
            title: PKG_LOCATION.name,
            alwaysNotify: true
        }),
        // optimizations
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.OccurenceOrderPlugin(),
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
        extractCSS
    ]
});