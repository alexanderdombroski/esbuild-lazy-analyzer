import { analyzeMetadata, readMetaFile } from './steps/analyze';
import { generateReport } from './steps/report';
import { getArg } from './utils/cli';
import fs from 'node:fs/promises';

async function main() {
	const metafile = getArg('--metafile');
	const outmeta = getArg('--outmeta');
	const filename = getArg('--filename');

	if (!metafile) {
		console.error('Error: --metafile argument is required.');
		process.exit(1);
	}

	if (!filename || !outmeta) {
		console.error('Error: either --filename and/or --outfile argument is required.');
		process.exit(1);
	}

	const metadata = await readMetaFile(metafile);
	const chunkLayerData = analyzeMetadata(metadata);

	if (filename) {
		const reportHtml = generateReport(metadata, chunkLayerData);
		await fs.writeFile(filename, reportHtml);
		console.log(`Report generated at ${filename}`);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
