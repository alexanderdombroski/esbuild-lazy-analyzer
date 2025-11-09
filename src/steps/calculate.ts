import type { MetafilePart } from '../types';

export function calcBundleSize(metaOutput: MetafilePart): number {
	return Object.values(metaOutput).reduce((acc, cur) => cur.bytes + acc, 0);
}

export function calcNumberOfChunks(metaOutput: MetafilePart): number {
	return Object.keys(metaOutput).length;
}

export function calcAverageChunkSize(metaOutput: MetafilePart): number {
	const sum = calcBundleSize(metaOutput);
	return sum / calcNumberOfChunks(metaOutput);
}

export function calcEagerImportSize(metaOutput: MetafilePart, eagerImports: string[]): number {
	return eagerImports.reduce((acc, cur) => {
		return acc + metaOutput[cur].bytes;
	}, 0);
}

export function calcMinChunkSize(metaOutput: MetafilePart): [string, number] {
	const sizes = Object.values(metaOutput).map(({ bytes }) => bytes);
	const minSize = Math.min(...sizes);
	const file = Object.entries(metaOutput).find(([, { bytes }]) => bytes === minSize)?.[0];
	return [file as string, minSize];
}

export function calcMaxChunkSize(metaOutput: MetafilePart): [string, number] {
	const sizes = Object.values(metaOutput).map(({ bytes }) => bytes);
	const maxSize = Math.max(...sizes);
	const file = Object.entries(metaOutput).find(([, { bytes }]) => bytes === maxSize)?.[0];
	return [file as string, maxSize];
}
