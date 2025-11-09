import type { BundleStats, EntryStats, Metafile, MetafilePart } from '../types/index';
import {
	calcAverageChunkSize,
	calcBundleSize,
	calcEagerImportSize,
	calcMaxChunkSize,
	calcMinChunkSize,
	calcNumberOfChunks,
} from './calculate';

export function analyzeMetadata(metadata: Metafile): BundleStats {
	const stats: Partial<BundleStats> = {};

	// Analyze imports
	type EntryStatsKVP = [string, EntryStats];
	const entryPoints = findEntryPoints(metadata.outputs);
	const entryPointStats: EntryStatsKVP[] = entryPoints.map((entry) => [
		entry,
		analyzeEntryPoint(metadata.outputs, entry, 'outputs'),
	]);
	const entryFiles = findEntryPoints(metadata.inputs);
	const entryFileStats: EntryStatsKVP[] = entryFiles.map((entry) => [
		entry,
		analyzeEntryPoint(metadata.inputs, entry, 'inputs'),
	]);
	stats.entryStats = Object.fromEntries([...entryFileStats, ...entryPointStats]);

	// Analyze sizes
	stats.preBundleSize = calcBundleSize(metadata.inputs);
	stats.bundleSize = calcBundleSize(metadata.outputs);
	stats.compressionPercentage = (1 - stats.bundleSize / stats.preBundleSize) * 100;

	stats.averageChunkSize = calcAverageChunkSize(metadata.outputs);
	const [minName, minSize] = calcMinChunkSize(metadata.outputs);
	stats.minChunk = { name: minName, size: minSize };
	const [maxName, maxSize] = calcMaxChunkSize(metadata.outputs);
	stats.maxChunk = { name: maxName, size: maxSize };

	stats.fileLeafs = findLeaves(metadata.inputs);
	stats.chunkLeafs = findLeaves(metadata.outputs);

	stats.numberOfChunks = calcNumberOfChunks(metadata.outputs);

	return stats as BundleStats;
}

/** Finds the entrypoint chunks */
function findEntryPoints(metadata: MetafilePart): string[] {
	// Entry points can import other files, but are never imported.
	const importedFiles = new Set<string>();
	const paths = Object.keys(metadata);

	paths.forEach((path) => {
		metadata[path].imports.forEach((imp) => {
			!imp.external && importedFiles.add(imp.path);
		});
	});

	return paths.filter((path) => !importedFiles.has(path));
}

function analyzeEntryPoint(
	metadata: MetafilePart,
	file: string,
	type: 'inputs' | 'outputs'
): EntryStats {
	const stats: Partial<EntryStats> = { type };

	[stats.eagerImports, stats.lazyImports] = categorizeImports(metadata, file);
	stats.longestDependencyChain = findLongestImportChain(metadata, file);
	stats.eagerImportSize = calcEagerImportSize(metadata, stats.eagerImports);

	return stats as EntryStats;
}

/** Recursively finds [eager, lazy] imports */
function categorizeImports(metadata: MetafilePart, file: string): [string[], string[]] {
	const eagerImports = new Set<string>();
	const lazyImports = new Set<string>();

	findEagerImports(metadata, file, eagerImports);
	findLazyImports(metadata, file, eagerImports, lazyImports);

	return [Array.from(eagerImports), Array.from(lazyImports)];
}

/** Code that is loaded immediatly */
function findEagerImports(metadata: MetafilePart, file: string, eagerImports: Set<string>) {
	eagerImports.add(file);

	metadata[file].imports
		.filter(
			({ external, kind, path: fp }) =>
				!eagerImports.has(fp) && !external && kind !== 'dynamic-import'
		)
		.forEach(({ path: fp }) => {
			findEagerImports(metadata, fp, eagerImports);
		});
}

/** Code that is conditionally and lazily loaded */
function findLazyImports(
	metadata: MetafilePart,
	file: string,
	eagerImports: Set<string>,
	lazyImports: Set<string>,
	isAnalysed?: Set<string>
) {
	isAnalysed ??= new Set();
	isAnalysed.add(file);
	const imports = metadata[file].imports.filter(({ external }) => !external);
	imports.forEach(({ path, kind }) => {
		if (kind === 'dynamic-import' && !eagerImports.has(path)) {
			lazyImports.add(path);
		}
		if (!isAnalysed.has(path)) {
			findLazyImports(metadata, path, eagerImports, lazyImports, isAnalysed);
		}
	});
}

function findLeaves(metadata: MetafilePart): string[] {
	return Object.entries(metadata)
		.filter(([, { imports }]) => imports.every(({ external }) => external))
		.map(([path]) => path);
}

function findLongestImportChain(
	metadata: MetafilePart,
	file: string,
	chain: string[] = []
): string[] {
	const newChain = [...chain, file];
	const imports = metadata[file].imports
		.filter(({ external, path }) => !external && !newChain.includes(path))
		.map(({ path }) => path);

	const newPaths = imports.map((imp) => findLongestImportChain(metadata, imp, newChain));
	const maxDepth = Math.max(...newPaths.map((arr) => arr.length));
	return newPaths.find((arr) => arr.length === maxDepth) ?? newChain;
}
