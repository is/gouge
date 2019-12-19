const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    "g": "./src/gouge",
  },
  target: 'node',
  mode: 'production',
  module: {
    rules: [
      {test: /\.ts?$/, use: 'ts-loader', exclude: /node_modules/},
    ],
  },
  resolve: {
    extensions:['.ts', '.js'],
  },
  plugins: [
    new webpack.BannerPlugin({banner: '#!/usr/bin/env node', raw:true}),
  ],
  externals: {
    'utf-8-validate': 'utf-8-validate',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname),
  },
  devtool: 'cheap-source-map'
};
