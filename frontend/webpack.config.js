const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')

module.exports = (_env, argv) => {
  const isDev = argv.mode !== 'production'
  // BUILD_TARGET=native is the bundle Electron and the Capacitor iOS app load
  // off disk (see `npm run build:native`); everything else is the web build.
  const isNative = process.env.BUILD_TARGET === 'native'

  return {
    entry: './src/main.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isDev ? '[name].js' : '[name].[contenthash].js',
      // The web build is served at real paths (/shared/abc, /documents/7),
      // so its assets need the absolute root or a deep link would look for
      // them under /shared/. The native build is loaded via file:// (Electron)
      // or capacitor://localhost (iOS), where only relative paths resolve.
      // webpack-dev-server needs the absolute root too, or its request routing
      // breaks.
      publicPath: isDev || !isNative ? '/' : './',
      clean: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: 'babel-loader',
        },
        {
          test: /\.scss$/,
          use: [
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader',
            { loader: 'sass-loader', options: { sassOptions: { loadPaths: [path.resolve(__dirname, 'src/styles')] } } },
          ],
        },
        {
          test: /\.css$/,
          use: [isDev ? 'style-loader' : MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf|otf)$/,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: './index.html', favicon: './src/assets/favicon.png' }),
      new webpack.DefinePlugin({
        // JSON.stringify(undefined) yields the bare `undefined` token (not a
        // string), so `?? 'default'` fallbacks in source still work when
        // these aren't set — an empty-string fallback here would break them.
        'process.env.API_URL': JSON.stringify(process.env.API_URL),
        'process.env.COLLAB_URL': JSON.stringify(process.env.COLLAB_URL),
        'process.env.BYPASS_AUTH': JSON.stringify(process.env.BYPASS_AUTH),
      }),
      !isDev && new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
      isDev && new ReactRefreshWebpackPlugin(),
    ].filter(Boolean),
    // VM-backed Docker (colima's virtiofs, and some Docker Desktop configs)
    // doesn't reliably propagate host filesystem events into the Linux
    // guest's inotify layer, so webpack's default watcher can silently
    // never fire on source edits inside the container. Dev always runs in
    // Docker here (see docker-compose.yml), so polling has no downside.
    watchOptions: isDev ? { poll: 500, ignored: /node_modules/ } : undefined,
    devServer: {
      host: '0.0.0.0',
      port: 5174,
      historyApiFallback: true,
      hot: true,
      allowedHosts: 'all',
    },
    devtool: isDev ? 'eval-source-map' : 'source-map',
  }
}
