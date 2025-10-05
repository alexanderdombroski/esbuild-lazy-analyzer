import css from '../components/styles.css';
import header from '../components/header.html';
import viewSwitcher from '../components/viewSwitcher.js';
import type { Metafile, ChunkLayer } from '../types/index';

export function generateReport(
	// eslint-disable-next-line no-unused-vars
	metafile: Metafile,
	// eslint-disable-next-line no-unused-vars
	chunkLayers: ChunkLayer[]
): string {
	// TODO: Use metafile and chunkLayers to build the report
	const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Esbuild Filemap</title>
  <style>${css}</style>
</head>
<body>
  ${header}
  <main class="main-content">
    <aside class="sidebar">
      <h2>Filters & Options</h2>
      <!-- Sidebar content will go here -->
    </aside>
    <section class="visualization-panel">
      <h1>Project Splitting Overview</h1>
      <!-- Main content will go here -->
    </section>
  </main>
</body>
<script>${viewSwitcher}</script>
</html>
  `;
	return html;
}
