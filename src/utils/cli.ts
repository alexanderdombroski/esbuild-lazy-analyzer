import fs from 'node:fs/promises';
import type { Metafile } from '../types';

/** Return an argument from the CLI, supporting both `--arg=value` and `--arg value` */
export const getArg = (argName: string): string | undefined => {
	const argv = process.argv;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		// Case 1: --arg=value
		if (arg.startsWith(`${argName}=`)) {
			return arg.split('=')[1];
		}

		// Case 2: --arg value
		if (arg === argName && i + 1 < argv.length) {
			return argv[i + 1];
		}
	}

	return undefined;
};

export async function readMetaFile(fp: string): Promise<Metafile> {
	const fileContent = await fs.readFile(fp, 'utf-8');
	return JSON.parse(fileContent);
}