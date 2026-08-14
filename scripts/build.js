if (!process.execArgv.includes('--openssl-legacy-provider') && !process.env.NODE_OPTIONS?.includes('--openssl-legacy-provider')) {
    const { spawnSync } = require('child_process')
    const result = spawnSync(process.execPath, [__filename, ...process.argv.slice(2)], {
        stdio: 'inherit',
        env: { ...process.env, NODE_OPTIONS: '--openssl-legacy-provider' },
    })
    process.exit(result.status ?? 1)
}

const webpack = require('webpack')
const config = require('../webpack.config')
const compiler = webpack(config)

const report = (error, stats) => {
    if (error) throw error
    const output = stats.toString({ colors: true, assets: true, chunks: false, modules: false })
    if (output) console.log(output)
    if (stats.hasErrors()) process.exitCode = 1
}

if (process.argv.includes('--watch')) {
    compiler.watch({}, report)
} else {
    compiler.run((error, stats) => {
        report(error, stats)
        compiler.close(closeError => {
            if (closeError) throw closeError
        })
    })
}
