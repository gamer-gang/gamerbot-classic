import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';
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
  },
  devtool: devMode ? 'inline-source-map' : 'source-map',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  externals: [nodeExternals()],
  target: 'node',
  // node: { __dirname: true },
  optimization: {
    emitOnErrors: false,
    minimizer: [
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
