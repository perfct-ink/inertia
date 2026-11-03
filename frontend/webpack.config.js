const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')

module.exports = (_env, argv) => {
  const isDev = argv.mode !== 'production'

  return {
    entry: './src/main.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isDev ? '[name].js' : '[name].[contenthash].js',
      // Absolute on the web so deep links like /shared/abc find their
      // bundles. The Electron and iOS builds load dist/index.html off disk,
      // so they set PUBLIC_PATH=./ (see package.json) for relative paths.
      publicPath: process.env.PUBLIC_PATH || '/',
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
        // Optional map tiles for the Collection map view; unset means no tiles
        // and no requests to any map server (docs/services.md).
        'process.env.MAP_TILE_URL': JSON.stringify(process.env.MAP_TILE_URL),
        'process.env.MAP_TILE_ATTRIBUTION': JSON.stringify(process.env.MAP_TILE_ATTRIBUTION),
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
