import css from '../components/styles.css';
import header from '../components/header.html';
import viewSwitcher from '../components/viewSwitcher.js';
import initChunks from '../components/initChunks.js';
import statisticsSection from '../components/statisticSection.html';
import splittingSection from '../components/splittingSection.html';
import importingSection from '../components/importingSection.html';
import type { Metafile, ChunkLayer } from '../types/index';

export function generateReport(metafile: Metafile, chunkLayers: ChunkLayer[]): string {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Esbuild Filemap</title>
  <style>${css}</style>
  <script>
    const metafile = ${JSON.stringify(metafile)}
    const chunkLayers = ${JSON.stringify(chunkLayers)}
  </script>
</head>
<body>
  ${header}
  <main class="main-content">
    <aside class="sidebar">
      <h2>Filters & Options</h2>
      <!-- Sidebar content will go here -->
    </aside>
    ${splittingSection}
    ${importingSection}
    ${statisticsSection}
  </main>
</body>
<script>${viewSwitcher}</script>
<script>${initChunks}</script>
</html>`;
}
