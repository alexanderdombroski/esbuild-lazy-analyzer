import { context, build } from 'esbuild';
import fs from 'node:fs/promises';
import htmlnano from 'htmlnano';
import postcss from "postcss";
import cssnano from 'cssnano';

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

/** @type {import('esbuild').Plugin} */
export const htmlCssNanoPlugin = {
  name: "html-css-nano",
  setup(build) {
    /* ---------- HTML ---------- */
    build.onLoad({ filter: /\.html$/ }, async (args) => {
      const html = await fs.readFile(args.path, "utf8");

      const { html: minifiedHtml } = await htmlnano.process(html, {
        collapseWhitespace: 'all',
        removeComments: 'all',
				minifyJs: false,
				minifySvg: false,
      });

      return {
        contents: minifiedHtml,
        loader: "text",
      };
    });

    /* ---------- CSS ---------- */
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await fs.readFile(args.path, "utf8");

      const result = await postcss([
        cssnano({
          preset: "default",
        }),
      ]).process(css, {
        from: args.path,
        map: false,
      });

      return {
        contents: result.css,
        loader: "text",
      };
    });
  },
};

/**
 * Bundle the component JavaScript files into a single minified file
 */
async function bundleComponents() {
	console.log('[components] bundling started');
	await build({
		entryPoints: ['src/components/analysis.js'],
		bundle: true,
		format: 'iife',
		minify: production,
		treeShaking: production,
		sourcemap: false,
		platform: 'browser',
		outfile: 'dist/bundle.js',
		target: 'es2020',
		logLevel: 'warning',
	});
	console.log('[components] bundling finished');
}

async function main() {
	// Bundle components before building main
	await bundleComponents();

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
		plugins: [esbuildProblemMatcherPlugin, htmlCssNanoPlugin],
		minifySyntax: true,
		chunkNames: 'chunks/[name]-[hash]',
		metafile: true,
		loader: { '.css': 'text', '.html': 'text', '.js': 'text', '.mjs': 'text' },
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
