import type { BundleStats, Metafile } from '.';
import type * as ChartJS from 'chart.js';

declare global {
	const bundleStats: BundleStats;
	const metafile: Metafile;
	const d3: typeof import('d3');
	const Chart: typeof ChartJS.Chart;
}
