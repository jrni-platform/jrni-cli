const webpack = require('webpack');
const WebpackBar = require('webpackbar');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const path = require('path');
const logger = require('./logger');
const { VueLoaderPlugin } = require('vue-loader');

async function bundle(configuration) {
    const projectRootPath = configuration.rootPath;

    // find out which paths are for angular apps and make sure we arse the HTML files for those ones seperatly
   let angularPaths = []

   if (configuration.manifest.panels){
       angularPaths = configuration.manifest.panels.map( panel => path.resolve(projectRootPath, panel))
   }
   
    const config = {
        context: process.cwd(),
        entry: {},
        optimization:{
            minimize: false
        },
        target: 'web',
        mode: configuration.isDev() ? 'development' : 'production',
        output: {
            library: 'jrni-app-' + configuration.manifest.unique_name,
            libraryTarget: 'window',
            filename: '[name].js',
            path: path.resolve(projectRootPath, 'build'),
            publicPath: './'
        },
        stats: 'verbose',
        performance: {
            hints: false
        },
        externals: {
            'bookingbug-configurator-js': 'bbConfig',
            'bookingbug-core-js': 'bbCore',
            'vuetify/lib': 'vuetify/lib',
            'brace/ext/language_tools': 'brace/ext/language_tools',
            'brace/mode/html': 'brace/mode/html',
            'brace/mode/javascript': 'brace/mode/javascript',
            'brace/mode/liquid': 'brace/mode/liquid',
            'brace/mode/css': 'brace/mode/css',
            'brace/theme/chrome': 'bracetheme/chrome',
            'brace/ext/searchbox': 'brace/ext/searchbox',
            'vue2-ace-editor': 'vue2-ace-editor'
        },       
        plugins: [
            new CleanWebpackPlugin(['build/**/*'], {
                root: projectRootPath,
                verbose: true,
                exclude: [],
                watch: false
            }),
            new WebpackBar(),
            new VueLoaderPlugin()
        ],
        module: {
            rules: [
                {
                    test: /^(?!.*\.spec\.js$).*\.js$/,
                    use: [
                        {
                            loader: path.resolve(__dirname, 'node_modules', 'ng-annotate-loader')
                        },
                        {
                            loader: path.resolve(__dirname, 'node_modules', 'babel-loader'),
                            options: {
                                presets: [
                                    [path.resolve(__dirname, 'node_modules', 'babel-preset-env'), {
                                        loose: true
                                    }]
                                ],
                                plugins: [
                                    path.resolve(__dirname, 'node_modules', 'babel-plugin-transform-object-rest-spread'),
                                    path.resolve(__dirname, 'node_modules', 'babel-plugin-transform-decorators-legacy'),
                                    path.resolve(__dirname, 'node_modules', 'babel-plugin-transform-async-to-generator'),
                                    path.resolve(__dirname, 'node_modules', 'babel-plugin-transform-optional-catch-binding'),
                                    path.resolve(__dirname, 'node_modules', 'babel-plugin-syntax-dynamic-import')
                                ]
                            }
                        },
                        {
                            loader: path.resolve(__dirname, 'node_modules', 'import-glob-loader')
                        }
                    ]
                },
                {
                    test: /.*\.vue$/,
                    use: [
                        path.resolve(__dirname, 'node_modules', 'vue-loader'),
                    ]
                },
                {
                    test: /\.scss$/,
                    use: [
                        path.resolve(__dirname, 'node_modules', 'style-loader'),
                        path.resolve(__dirname, 'node_modules', 'css-loader'),
                        path.resolve(__dirname, 'node_modules', 'sass-loader')
                    ]
                },
                {
                    include: angularPaths,      
                    test: /.*\.html$/,
                    use: path.resolve(__dirname, 'node_modules', `ng-cache-loader?prefix=${configuration.manifest.unique_name}&exportId`),
                },
                {
                    test: /\.(jpe?g|png|gif|ico)$/i,
                    use: path.resolve(__dirname, 'node_modules', 'url-loader?name=images/[name].[ext]')
                },
                {
                    test: /.*fontawesome.*\.svg$/,
                    use: path.resolve(__dirname, 'node_modules', 'url-loader?name=fonts/[name].[ext]')
                },
                {
                    test: /\.font\.(?=svg$)/,
                    use: path.resolve(__dirname, 'node_modules', 'url-loader?name=fonts/[name].[ext]')
                },
                {
                    test: /\.svg$/,
                    exclude: /\.font\.(?=svg$)/,
                    use: path.resolve(__dirname, 'node_modules', 'url-loader?name=images/[name].[ext]')
                },
                {
                    test: /\.(woff2?|ttf|otf|eot)$/,
                    use: path.resolve(__dirname, 'node_modules', 'url-loader?name=fonts/[name].[ext]')
                }
            ]
        }
    };
    if (configuration.manifest.panels && configuration.manifest.panels.length > 0) {
        config.entry.panel = [path.resolve(projectRootPath, 'entry.js')];
    }
    if (configuration.manifest.launchers) {
        config.entry.launcher = [path.resolve(projectRootPath, 'launcher.js')];
    }
    if (configuration.manifest.jext && configuration.manifest.jext.length > 0) {
        config.entry.jext = [path.resolve(projectRootPath, 'entry-jext.js')];
    }

    return new Promise((resolve, reject) => {
        if (Object.keys(config.entry).length === 0) {
            logger.info('Skipping webpack bundle');
            resolve();
        } else {
            logger.info('Started webpack bundle');
            webpack(config, (err, stats) => {
                if (err) reject(err);
                if (stats.compilation.errors && stats.compilation.errors.length > 0) {
                    for (i = 0; i < stats.compilation.errors.length; i++) {
                        logger.fatal(stats.compilation.errors[i]);
                    }
                    reject('Webpack error');
                } else if (stats.hasErrors()) {
                    reject(stats.toJson().errors);
                } else {
                    if (stats.hasWarnings()) logger.warn(stats.toJson().warnings);
                    stats.toString().split("\n").forEach(logger.info);
                    logger.info('Completed webpack bundle');
                    resolve();
                }
            });
        }
    });
}

module.exports = bundle;
