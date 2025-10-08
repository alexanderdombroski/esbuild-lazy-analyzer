import initChunks from '../components/initChunks.js';
import lovable from '../components/lovable.html';
import lovableCss from '../components/lovable.css';
import lovableJs from '../components/lovable.js';

import type { Metafile, ChunkLayer } from '../types/index';

export function generateReport(metafile: Metafile, chunkLayers: ChunkLayer[]): string {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Esbuild Filemap</title>
  <style>${lovableCss}</style>
  <script>
    var metafile = ${JSON.stringify(metafile)}
    var chunkLayers = ${JSON.stringify(chunkLayers)}
  </script>
</head>
<body>
  <div class="app-container">
    ${lovable}
  </div>
</body>
<script>${initChunks}</script>
<script>${lovableJs}</script>
</html>`;
}
