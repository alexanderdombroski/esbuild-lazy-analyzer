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

/** The shared properties of inputs and outputs */
export type MetafilePart = {
	[path: string]: {
		bytes: number;
		imports: {
			path: string;
			kind: ImportKind;
			external?: boolean;
		}[];
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

export type BundleStats = {
	numberOfChunks: number;
	preBundleSize: number;
	bundleSize: number;
	compressionPercentage: number;
	minChunk: {
		name: string;
		size: number;
	};
	maxChunk: {
		name: string;
		size: number;
	};
	averageChunkSize: number;
	fileLeafs: string[];
	chunkLeafs: string[];
	entryStats: {
		[entryPoint: string]: EntryStats;
	};
};

export type EntryStats = {
	eagerImports: string[];
	lazyImports: string[];
	longestDependencyChain: string[];
	eagerImportSize: number;
};
