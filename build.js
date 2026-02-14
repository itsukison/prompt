const esbuild = require('esbuild');

const config = {
    entryPoints: ['src/renderer/app.js'],
    bundle: true,
    outfile: 'src/renderer/bundle.js',
    platform: 'browser',
    format: 'iife',
    sourcemap: true,
};

async function build() {
    try {
        await esbuild.build(config);
        console.log('Build successful!');
    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

async function watch() {
    try {
        const ctx = await esbuild.context(config);
        console.log('Watching for changes...');
        await ctx.watch();
    } catch (e) {
        console.error('Watch failed:', e);
        process.exit(1);
    }
}

if (process.argv.includes('--watch')) {
    watch();
} else {
    build();
}
