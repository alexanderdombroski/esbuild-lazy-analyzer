import { context } from 'esbuild';
import fs from 'node:fs/promises';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

/**
 * @type {import('esbuild').Plugin}
 */
const minifyCSSTextPlugin = {
    name: 'minify-css-text',
    setup(build) {
        build.onLoad({ filter: /\.css$/ }, async (args) => {
            const css = await fs.readFile(args.path, 'utf8');
            // Simple CSS minification
            const minified = production 
                ? css
                    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
                    .replace(/\s+/g, ' ') // Collapse whitespace
                    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove space around special chars
                    .replace(/;}/g, '}') // Remove last semicolon in block
                    .trim()
                : css;
            return {
                contents: minified,
                loader: 'text',
            };
        });
    },
};

async function main() {
	const ctx = await context({
		entryPoints: ['src/main.ts'],
		bundle: true,
		format: 'esm',
		minify: production,
		keepNames: !production,
		treeShaking: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outdir: 'dist',
		banner: { js: '#!/usr/bin/env node' },
		splitting: true,
		external: [...(await import('node:module')).builtinModules],
		logLevel: 'silent',
		plugins: [esbuildProblemMatcherPlugin, minifyCSSTextPlugin],
		minifySyntax: true,
		chunkNames: 'chunks/[name]-[hash]',
		metafile: true,
		loader: { '.css': 'text', '.html': 'text', '.js': 'text' },
	});
	if (watch) {
		await ctx.watch();
	} else {
		const result = await ctx.rebuild();
		await fs.mkdir('./profile', { recursive: true });
		await fs.writeFile('./profile/meta.json', JSON.stringify(result.metafile));
		await ctx.dispose();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
