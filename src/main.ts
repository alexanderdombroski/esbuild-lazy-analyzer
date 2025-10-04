import { getArg } from './utils/cli';

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
