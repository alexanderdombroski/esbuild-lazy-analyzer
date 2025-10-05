/** json metadata from esbuild */
export type Metafile = {
	// Source: https://esbuild.github.io/api/#metafile
	inputs: {
		[path: string]: {
			bytes: number;
			imports: {
				path: string;
				kind: ImportKind;
				external?: boolean;
				original?: string;
				with?: Record<string, string>;
			}[];
			format?: string;
			with?: Record<string, string>;
		};
	};
	outputs: {
		[path: string]: {
			bytes: number;
			inputs: {
				[path: string]: {
					bytesInOutput: number;
				};
			};
			imports: {
				path: string;
				kind: ImportKind;
				external?: boolean;
			}[];
			exports: string[];
			entryPoint?: string;
			cssBundle?: string;
		};
	};
};

export type ImportKind =
	| 'import-statement'
	| 'require-call'
	| 'dynamic-import'
	| 'require-resolve'
	| 'import-rule'
	| 'url-token'
	| 'entry-point'
	| 'export-statement'
	| 'internal'
	| 'file-loader'
	| 'data-url'
	| 'json-import';

export type ChunkLayer = {
	/** Entry chunk */
	path: string;
	/** The minimum number of bytes that will be loaded when importing the chunk */
	minNewBytes: number;
	/** The maximum number of bytes that could be loaded when importing the chunk */
	maxNewBytes: number;
	/** Chunks guarenteed to be loaded in this layer. */
	eagerImports: string[];
	/** An array of paths */
	chunkLayers: ChunkLayer[];
	/** is loaded on entrypoint */
	isEntryPoint: boolean;
};

export type EagerChunkAnalysis = {
	minBytes: number;
	maxBytes: number;
	eagerImports: string[];
	lazyImports: string[];
};
