import type { ChunkLayer, Metafile } from '.';

declare global {
	const chunkLayers: ChunkLayer[];
	const metafile: Metafile;
}
