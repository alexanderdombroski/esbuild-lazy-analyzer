import { analyzeMetadata, readMetaFile } from './steps/analyze';
import { generateReport } from './steps/report';
import { getArg } from './utils/cli';
import fs from 'node:fs/promises';

async function main() {
	const metafile = getArg('--metafile');
	const filename = getArg('--filename');

	if (!metafile) {
		console.error('Error: --metafile argument is required.');
		process.exit(1);
	}

	if (!filename) {
		console.error('Error: --filename argument is required.');
		process.exit(1);
	}

	const metadata = await readMetaFile(metafile);
	const chunkLayerData = analyzeMetadata(metadata);
	const reportHtml = generateReport(chunkLayerData);
	await fs.writeFile(filename, reportHtml);
	console.log(`Report generated at ${filename}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
