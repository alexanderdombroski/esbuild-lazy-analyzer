import fs from 'node:fs/promises';
import type { ChunkLayer, EagerChunkAnalysis, Metafile } from '../types/index';

export async function readMetaFile(fp: string): Promise<Metafile> {
	const fileContent = await fs.readFile(fp, 'utf-8');
	return JSON.parse(fileContent);
}

/** Finds the entrypoint chunks */
export function findEntryPoints(metadata: Metafile): string[] {
	const importedFiles = new Set<string>();
	const paths = Object.keys(metadata.outputs);

	paths.forEach((path) => {
		metadata.outputs[path].imports.forEach((imp) => {
			!imp.external && importedFiles.add(imp.path);
		});
	});

	return paths.filter((path) => !importedFiles.has(path));
}

export function analyzeMetadata(metadata: Metafile): ChunkLayer[] {
	const entryPoints = findEntryPoints(metadata);
	const chunkLayers = new Array<ChunkLayer>(entryPoints.length);

	entryPoints.forEach((entry, i) => {
		const alreadyImported = new Set<string>();
		chunkLayers[i] = analyzeChunkLayer(metadata, entry, alreadyImported, true);
	});

	return chunkLayers;
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
