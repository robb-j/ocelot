// ...

const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: path.resolve(__dirname, 'src/app.ts'),
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'assets/js')
  },
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ }
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin()
  ]
}
