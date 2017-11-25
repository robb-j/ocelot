// ...

const path = require('path')
const webpack = require('webpack')

const ExtractTextPlugin = require('extract-text-webpack-plugin')

module.exports = {
  entry: path.resolve(__dirname, 'src/app.ts'),
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'assets/js')
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader'
        })
      },
      {
        test: /\.styl$/,
        // loader: 'style-loader!css-loader!stylus-loader'
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader!stylus-loader'
        })
      }
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js', '.styl' ]
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new ExtractTextPlugin('../css/styles.css')
  ]
}
