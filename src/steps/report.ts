import analysis from '../components/analysis.html';
import analysisCss from '../components/analysis.css';
// Running npm build will generate this file
import analysisJs from '../../dist/bundle.js';

import type { Metafile, BundleStats } from '../types/index';

export function generateReport(metafile: Metafile, bundleStats: BundleStats): string {
	return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Analyze your ESBuild bundles with interactive visualizations, lazy loading insights, and metrics" />
  <title>Esbuild Filemap</title>
  <style>${analysisCss}</style>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script>
    window.metafile = ${JSON.stringify(metafile)};
    window.bundleStats = ${JSON.stringify(bundleStats)};
  </script>
</head>
<body>
  ${analysis}
</body>
<script>${analysisJs}</script>
</html>`;
}
