import { Configuration } from 'webpack';
import path from 'path';
import eslintPlugin from 'eslint-webpack-plugin';
import gasPlugin from 'gas-webpack-plugin';

const config: Configuration = {
  mode: 'development',
  devtool: false,
  entry: {
    main: path.join(__dirname, 'src', 'main.ts'),
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'dist'),
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
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new eslintPlugin({
      exclude: 'node_modules',
    }),
    new gasPlugin(),
  ],
};

export default config;
