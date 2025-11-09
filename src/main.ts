import { analyzeMetadata } from './steps/analyze';
import { generateReport } from './steps/report';
import { getArg, readMetaFile } from './utils/cli';
import fs from 'node:fs/promises';

async function main() {
	const metafile = getArg('--metafile');
	const outmeta = getArg('--outmeta');
	const outreport = getArg('--outreport');

	if (!metafile) {
		console.error('Error: --metafile argument is required.');
		process.exit(1);
	}

	if (!(outreport || outmeta)) {
		console.error('Error: either --outreport and/or --outmeta argument is required.');
		process.exit(1);
	}

	const metadata = await readMetaFile(metafile);
	const stats = analyzeMetadata(metadata);

	if (outmeta) {
		await fs.writeFile(outmeta, JSON.stringify(stats, undefined, 2));
		console.log(`Stats generated at ${outmeta}`);
	}

	if (outreport) {
		const reportHtml = generateReport(metadata, stats);
		await fs.writeFile(outreport, reportHtml);
		console.log(`Report generated at ${outreport}`);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
