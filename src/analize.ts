import fs from 'node:fs/promises';
import type { Metafile } from './types';

export async function readMetaFile(fp: string): Promise<Metafile> {
	const fileContent = await fs.readFile(fp, 'utf-8');
	return JSON.parse(fileContent);
}
