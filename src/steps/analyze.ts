import type { ChunkLayer, EagerChunkAnalysis, Metafile, MetafilePart, Stats } from '../types/index';

export function analyzeMetadata(metadata: Metafile): Stats[] {
	const entryPoints = findEntryPoints(metadata.outputs);
	return entryPoints.map((entry) => analyzeEntryPoint(metadata.outputs, entry));
}

/** Finds the entrypoint chunks */
export function findEntryPoints(metadata: MetafilePart): string[] {
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

export function analyzeEntryPoint(metadata: MetafilePart, file: string): Stats {
	const stats: Partial<Stats> = {};

	[stats.eagerImports, stats.lazyImports] = categorizeImports(metadata, file);

	return stats as Stats;
}

/** Recursively finds [eager, lazy] imports */
function categorizeImports(metadata: MetafilePart, file: string): [string[], string[]] {
	const eagerImports = new Set<string>();
	
	findEagerImports(metadata, file, eagerImports);

	const lazyImports: string[] = Object.keys(metadata).filter((file) => !eagerImports.has(file));

	return [
		Array.from(eagerImports),
		lazyImports,
	];
}

export function findEagerImports(
	metadata: MetafilePart,
	file: string,
	eagerImports: Set<string>,
) {
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

export function analyzeChunkLayer(
	metadata: Metafile,
	chunkName: string,
	alreadyImported: Set<string>,
	isEntryPoint: boolean
): ChunkLayer {
	let minNewBytes = 0;
	let maxNewBytes = 0;

	// Anaylize Eager chunks
	const { minBytes, maxBytes, eagerImports, lazyImports } = analyzeEagerChunk(
		metadata,
		chunkName,
		alreadyImported,
		isEntryPoint
	);
	minNewBytes += minBytes;
	maxNewBytes += maxBytes;

	// Analyze Lazy Chunks
	const chunkLayers = lazyImports.map((name) =>
		analyzeChunkLayer(metadata, name, alreadyImported, false)
	);

	return {
		path: chunkName,
		minNewBytes,
		maxNewBytes,
		isEntryPoint,
		eagerImports,
		chunkLayers,
	};
}

function analyzeEagerChunk(
	metadata: Metafile,
	chunkName: string,
	alreadyImported: Set<string>,
	isEntryPoint: boolean
): EagerChunkAnalysis {
	alreadyImported.add(chunkName);
	const chunkData = metadata.outputs[chunkName];
	const importedChunks = metadata.outputs[chunkName].imports.filter(({ external }) => !external);

	let minBytes = chunkData.bytes;
	let maxBytes = chunkData.bytes;

	const eagerImports: string[] = [];
	const lazyImports: string[] = [];

	importedChunks
		.filter(({ kind }) => kind !== 'dynamic-import')
		.forEach(({ path }) => {
			if (!alreadyImported.has(path)) {
				eagerImports.push(path);
				const eagerChunk = analyzeEagerChunk(metadata, path, alreadyImported, isEntryPoint);
				if (isEntryPoint) {
					minBytes += eagerChunk.minBytes;
				}
				maxBytes += eagerChunk.maxBytes;
				eagerImports.push(...eagerChunk.eagerImports);
				lazyImports.push(...eagerChunk.lazyImports);
			}
		});

	lazyImports.unshift(
		...importedChunks
			.filter(({ kind, path }) => kind === 'dynamic-import' && !alreadyImported.has(path))
			.map(({ path }) => path)
	);

	return {
		minBytes,
		maxBytes,
		eagerImports,
		lazyImports: Array.from(new Set(lazyImports)),
	};
}
