const path = require('path');

module.exports = {
    mode: 'development',
    entry: './index.ts',
    // devtool: 'inline-source-map',
    output: {
        path: path.resolve(__dirname, ''),
        filename: 'index.dist.js'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    },
    devServer: {
        contentBase: path.join(__dirname, ''),
        compress: true,
        port: 9001
    }
}