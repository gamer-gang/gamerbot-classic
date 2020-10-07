import ForkTsCheckerPlugin from 'fork-ts-checker-webpack-plugin';
import NodemonPlugin from 'nodemon-webpack-plugin';
import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import webpack, { EnvironmentPlugin, ProgressPlugin } from 'webpack';
import nodeExternals from 'webpack-node-externals';

const devMode = process.env.NODE_ENV !== 'production';

export default <webpack.Configuration>{
  mode: devMode ? 'development' : 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs',
    chunkFilename: '[name].js',
    publicPath: path.resolve(__dirname, 'dist'),
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]',
  },
  devtool: devMode
    ? process.env.NODEMON
      ? 'eval-cheap-module-source-map'
      : 'inline-source-map'
    : 'source-map',
  resolve: {
    extensions: ['.ts', '.js'],
    symlinks: false,
  },
  plugins: [
    ...(process.env.DOCKER ? [] : [new ProgressPlugin({})]),
    ...(process.env.NODEMON ? [new NodemonPlugin()] : []),
    new EnvironmentPlugin({ WEBPACK: true }),
    new ForkTsCheckerPlugin({
      eslint: {
        enabled: true,
        files: './src/**/*.{ts,tsx,js,jsx}',
      },
      logger: {
        devServer: false,
        infrastructure: 'silent',
        issues: 'webpack-infrastructure',
      },
    }),
  ],
  stats: { preset: 'normal', colors: true },
  externals: [nodeExternals()],
  target: 'node',
  experiments: {
    topLevelAwait: true,
  },
  optimization: {
    emitOnErrors: false,
    minimizer: devMode
      ? undefined
      : [
          new TerserPlugin({
            terserOptions: {
              // We want to minify the bundle, but don't want Terser to change the names of our entity
              // classes. This can be controlled in a more granular way if needed, (see
              // https://terser.org/docs/api-reference.html#mangle-options) but the safest default
              // config is that we simply disable mangling altogether but allow minification to proceed.
              mangle: false,
            },
          }),
        ],
  },
  module: {
    rules: [
      {
        test: /\.js(x?)$/,
        enforce: 'pre',
        loader: 'source-map-loader',
      },
      {
        test: /\.ts(x?)/,
        loader: 'ts-loader',
        options: { transpileOnly: true },
      },
      {
        test: /\.node$/,
        use: 'node-loader',
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
    ],
  },
};
