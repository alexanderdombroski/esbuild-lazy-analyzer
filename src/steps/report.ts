import lovable from '../components/lovable.html';
import lovableCss from '../components/lovable.css';
import lovableJs from '../components/lovable.js';

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
  <style>${lovableCss}</style>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script>
    var metafile = ${JSON.stringify(metafile)};
    var bundleStats = ${JSON.stringify(bundleStats)};
  </script>
</head>
<body>
  ${lovable}
</body>
<script>${lovableJs}</script>
</html>`;
}
