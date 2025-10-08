// Utility Functions
function formatBytes(bytes) {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateColor(index) {
	const hues = [
		210, 280, 340, 40, 160, 190, 260, 310, 20, 80, 120, 140, 180, 220, 240, 300, 320, 0, 60, 100,
	];
	return `hsl(${hues[index % hues.length]}, 70%, 60%)`;
}

function generateLayerColor(layer, offset = 0) {
	const layerHues = [210, 340, 40, 160, 280, 120, 260, 20];
	const baseHue = layerHues[layer % layerHues.length];
	return `hsl(${(baseHue + offset) % 360}, 65%, 55%)`;
}

function calculatePercentage(part, total) {
	return ((part / total) * 100).toFixed(2);
}

// Data Processing
// let metafile = window.metafile || { inputs: {}, outputs: {} };
// let chunkLayers = window.chunkLayers || [];
let currentSort = 'size';
let currentView = 'grid';
let currentEntrypoint = 'all';
let currentGraphEntrypoint = 0;

function getChunksData() {
	const chunks = [];
	const totalSize = Object.values(metafile.outputs).reduce((sum, output) => sum + output.bytes, 0);

	Object.entries(metafile.outputs).forEach(([path, data], index) => {
		const files = Object.entries(data.inputs).map(([filePath, fileData]) => ({
			path: filePath,
			bytes: fileData.bytesInOutput,
			percentage: calculatePercentage(fileData.bytesInOutput, data.bytes),
		}));

		chunks.push({
			path,
			bytes: data.bytes,
			files,
			color: generateColor(index),
			percentage: calculatePercentage(data.bytes, totalSize),
			exports: data.exports || [],
			imports: data.imports || [],
			isEntry: !!data.entryPoint,
		});
	});

	return chunks;
}

function sortChunks(chunks, sortBy) {
	if (sortBy === 'size') {
		return [...chunks].sort((a, b) => b.bytes - a.bytes);
	} else {
		return [...chunks].sort((a, b) => a.path.localeCompare(b.path));
	}
}

// Grid View Rendering
function renderGridView() {
	const chunksGrid = document.getElementById('chunks-grid');
	if (!chunksGrid) throw new Error("Couldn't find chunks grid element");
	const chunks = sortChunks(getChunksData(), currentSort);

	chunksGrid.innerHTML = '';

	// @ts-ignore
	chunks.forEach((chunk, index) => {
		const chunkEl = document.createElement('div');
		chunkEl.className = 'chunk-item';
		chunkEl.style.flex = `${chunk.bytes} 1 0`;
		chunkEl.style.backgroundColor = chunk.color;

		const chunkName = chunk.path.split('/').pop();

		chunkEl.innerHTML = `
          <div class="chunk-header">
            <div class="chunk-name">${chunkName}</div>
            <div class="chunk-size">${formatBytes(chunk.bytes)}</div>
          </div>
          <div class="files-grid"></div>
        `;

		const filesGrid = chunkEl.querySelector('.files-grid');
		// @ts-ignore
		chunk.files.forEach((file, fileIndex) => {
			const fileEl = document.createElement('div');
			fileEl.className = 'file-item';
			fileEl.style.flex = `${file.bytes} 1 0`;
			fileEl.style.backgroundColor = `${chunk.color}88`;

			const fileName = file.path.split('/').pop();
			fileEl.innerHTML = `<span class="file-name">${fileName}</span>`;

			fileEl.addEventListener('mouseenter', (e) => showTooltip(e, file, chunk));
			fileEl.addEventListener('mouseleave', hideTooltip);

			filesGrid?.appendChild(fileEl);
		});

		chunkEl.addEventListener('mouseenter', (e) => showChunkTooltip(e, chunk));
		chunkEl.addEventListener('mouseleave', hideTooltip);

		chunksGrid.appendChild(chunkEl);
	});
}

// Statistics View Rendering
function renderStatsView() {
	renderStatsCards();
	renderBarChart();
}

function renderStatsCards() {
	const cardsContainer = document.getElementById('stats-cards');
	if (!cardsContainer) throw new Error("Couldn't find stats card");
	const chunks = getChunksData();
	const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.bytes, 0);
	const avgChunkSize = totalBytes / chunks.length;

	let eagerBytes = 0;
	let lazyBytes = 0;

	if (chunkLayers.length > 0) {
		chunkLayers.forEach((layer) => {
			eagerBytes += layer.minNewBytes || 0;
		});
		lazyBytes = totalBytes - eagerBytes;
	}

	const stats = [
		{ label: 'Total Chunks', value: chunks.length.toString() },
		{ label: 'Total Bundle Size', value: formatBytes(totalBytes) },
		{ label: 'Average Chunk Size', value: formatBytes(avgChunkSize) },
		{
			label: '% Eagerly Imported',
			value: eagerBytes > 0 ? `${calculatePercentage(eagerBytes, totalBytes)}%` : 'N/A',
		},
		{
			label: '% Lazily Imported',
			value: lazyBytes > 0 ? `${calculatePercentage(lazyBytes, totalBytes)}%` : 'N/A',
		},
		{ label: 'Entry Points', value: chunks.filter((c) => c.isEntry).length.toString() },
	];

	cardsContainer.innerHTML = stats
		.map(
			(stat) => `
        <div class="stat-card">
          <div class="stat-value">${stat.value}</div>
          <div class="stat-label">${stat.label}</div>
        </div>
      `
		)
		.join('');
}

function renderBarChart() {
	const chartContainer = document.getElementById('bar-chart');
	if (!chartContainer) throw new Error("Couldn't find bar chart container");
	const chunks = sortChunks(getChunksData(), 'size').slice(0, 10);
	const maxBytes = chunks[0]?.bytes || 1;

	chartContainer.innerHTML = chunks
		// @ts-ignore
		.map((chunk, index) => {
			const percentage = (chunk.bytes / maxBytes) * 100;
			const chunkName = chunk.path.split('/').pop();

			return `
          <div class="bar-item">
            <div class="bar-label">${chunkName}</div>
            <div class="bar-wrapper">
              <div class="bar-fill" style="width: ${percentage}%; background: ${chunk.color};">
                <span class="bar-value">${formatBytes(chunk.bytes)}</span>
              </div>
            </div>
          </div>
        `;
		})
		.join('');
}

// Tooltip Functions
function showTooltip(e, file, chunk) {
	const tooltip = document.getElementById('tooltip');
	if (!tooltip) throw new Error("Couldn't find tooltip container");
	const totalBytes = getChunksData().reduce((sum, c) => sum + c.bytes, 0);

	tooltip.innerHTML = `
        <div class="tooltip-title">${file.path.split('/').pop()}</div>
        <div class="tooltip-row">
          <span>Size:</span>
          <span>${formatBytes(file.bytes)}</span>
        </div>
        <div class="tooltip-row">
          <span>% of Chunk:</span>
          <span>${file.percentage}%</span>
        </div>
        <div class="tooltip-row">
          <span>% of Build:</span>
          <span>${calculatePercentage(file.bytes, totalBytes)}%</span>
        </div>
        <div class="tooltip-row">
          <span>Chunk:</span>
          <span>${chunk.path.split('/').pop()}</span>
        </div>
      `;

	positionTooltip(e);
	tooltip.classList.remove('hidden');
}

function showChunkTooltip(e, chunk) {
	const tooltip = document.getElementById('tooltip');
	if (!tooltip) throw new Error("Couldn't find tooltip container");
	// @ts-ignore
	const totalBytes = getChunksData().reduce((sum, c) => sum + c.bytes, 0);

	tooltip.innerHTML = `
        <div class="tooltip-title">${chunk.path.split('/').pop()}</div>
        <div class="tooltip-row">
          <span>Size:</span>
          <span>${formatBytes(chunk.bytes)}</span>
        </div>
        <div class="tooltip-row">
          <span>% of Build:</span>
          <span>${chunk.percentage}%</span>
        </div>
        <div class="tooltip-row">
          <span>Files:</span>
          <span>${chunk.files.length}</span>
        </div>
        <div class="tooltip-row">
          <span>Exports:</span>
          <span>${chunk.exports.length}</span>
        </div>
        <div class="tooltip-row">
          <span>Imports:</span>
          <span>${chunk.imports.length}</span>
        </div>
        ${chunk.isEntry ? '<div class="tooltip-badge">Entry Point</div>' : ''}
      `;

	positionTooltip(e);
	tooltip.classList.remove('hidden');
}

function positionTooltip(e) {
	const tooltip = document.getElementById('tooltip');
	if (!tooltip) throw new Error("Couldn't find tooltip container");
	const x = e.clientX + 15;
	const y = e.clientY + 15;

	tooltip.style.left = x + 'px';
	tooltip.style.top = y + 'px';
}

function hideTooltip() {
	document.getElementById('tooltip')?.classList.add('hidden');
}

// Graph View Rendering
function renderGraphView() {
	const svg = document.getElementById('graph-svg');
	if (!svg) throw new Error("Couldn't find graph svg");
	const layer = chunkLayers[currentGraphEntrypoint];
	if (!layer) return;

	const width = svg.clientWidth || 1000;
	const height = svg.clientHeight || 800;
	const centerX = width / 2;
	const centerY = height / 2;
	const NODE_RADIUS = 20;

	svg.innerHTML = '';

	const nodes = [];
	const edges = [];

	function processLayer(layerData, depth, parentNode, angleStart, angleEnd) {
		const chunks = layerData.eagerImports || [];
		const subLayers = layerData.chunkLayers || [];
		const allItems = [...chunks, ...subLayers];

		if (allItems.length === 0) return;

		const RADIUS = 75 + depth * 120;
		const angleStep = (angleEnd - angleStart) / allItems.length;

		allItems.forEach((item, index) => {
			const angle = angleStart + angleStep * (index + 0.5);
			const x = centerX + RADIUS * Math.cos(angle);
			const y = centerY + RADIUS * Math.sin(angle);

			const isLayer = typeof item === 'object' && item.path;
			const path = isLayer ? item.path : item;
			const chunkData = metafile.outputs[path];
			const eager = layerData.eagerImports.includes(path);

			const node = {
				path,
				x,
				y,
				depth,
				eager,
				color: generateLayerColor(depth, eager ? 10 : -10),
				chunkData,
			};

			nodes.push(node);

			if (parentNode) {
				edges.push({ from: parentNode, to: node });
			}

			if (isLayer && item.chunkLayers && item.chunkLayers.length > 0) {
				processLayer(item, depth + 1, node, angle - angleStep / 2, angle + angleStep / 2);
			}
		});
	}

	// Add root node
	const rootNode = {
		path: layer.path,
		x: centerX,
		y: centerY,
		depth: 0,
		color: generateLayerColor(0),
		chunkData: metafile.outputs[layer.path],
	};
	nodes.push(rootNode);

	// Process all layers
	processLayer(layer, 1, rootNode, 0, Math.PI * 2);

	// Draw edges
	edges.forEach((edge) => {
		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', edge.from.x);
		line.setAttribute('y1', edge.from.y);
		line.setAttribute('x2', edge.to.x);
		line.setAttribute('y2', edge.to.y);
		line.setAttribute('stroke', '#444');
		line.setAttribute('stroke-width', '2');
		line.setAttribute('opacity', '0.4');
		svg.appendChild(line);
	});

	// Draw nodes
	nodes.forEach((node) => {
		const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		circle.setAttribute('cx', String(node.x));
		circle.setAttribute('cy', String(node.y));
		circle.setAttribute('r', String(NODE_RADIUS));
		circle.setAttribute('fill', node.color);
		circle.setAttribute('stroke', '#fff');
		circle.setAttribute('stroke-width', '2');
		circle.style.cursor = 'pointer';
		circle.style.transition = 'all 0.2s';

		circle.addEventListener('mouseenter', (e) => {
			circle.setAttribute('r', String(NODE_RADIUS * 1.2));
			showGraphNodeTooltip(e, node);
		});

		circle.addEventListener('mouseleave', () => {
			circle.setAttribute('r', String(NODE_RADIUS));
			hideTooltip();
		});

		svg.appendChild(circle);

		// Add text label
		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		text.setAttribute('x', String(node.x));
		text.setAttribute('y', String(node.y + NODE_RADIUS + 20));
		text.setAttribute('text-anchor', 'middle');
		text.setAttribute('fill', '#fff');
		text.setAttribute('font-size', '12');
		text.setAttribute('pointer-events', 'none');
		text.textContent = node.path.split('/').pop().substring(0, 15);
		svg.appendChild(text);
	});
}

function showGraphNodeTooltip(e, node) {
	const tooltip = document.getElementById('tooltip');
	if (!tooltip) throw new Error("Couldn't find tooltip container");
	const totalBytes = getChunksData().reduce((sum, c) => sum + c.bytes, 0);
	const chunkData = node.chunkData;

	if (!chunkData) return;

	const files = Object.entries(chunkData.inputs || {}).length;

	tooltip.innerHTML = `
        <div class="tooltip-title">${node.path.split('/').pop()}</div>
        <div class="tooltip-row">
          <span>Size:</span>
          <span>${formatBytes(chunkData.bytes)}</span>
        </div>
        <div class="tooltip-row">
          <span>% of Build:</span>
          <span>${calculatePercentage(chunkData.bytes, totalBytes)}%</span>
        </div>
        <div class="tooltip-row">
          <span>Files:</span>
          <span>${files}</span>
        </div>
        <div class="tooltip-row">
          <span>Import Type:</span>
          <span>${!node.eager ? 'Lazy' : 'Eager'}</span>
        </div>
        <div class="tooltip-row">
          <span>Exports:</span>
          <span>${chunkData.exports?.length || 0}</span>
        </div>
        <div class="tooltip-row">
          <span>Imports:</span>
          <span>${chunkData.imports?.length || 0}</span>
        </div>
      `;

	positionTooltip(e);
	tooltip.classList.remove('hidden');
}

// Event Listeners
document.querySelectorAll('.toggle-btn').forEach((btn) => {
	btn.addEventListener('click', () => {
		// @ts-ignore
		const view = btn.dataset.view;
		currentView = view;

		document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
		btn.classList.add('active');

		document.getElementById('grid-view')?.classList.toggle('hidden', view !== 'grid');
		document.getElementById('stats-view')?.classList.toggle('hidden', view !== 'stats');
		document.getElementById('graph-view')?.classList.toggle('hidden', view !== 'graph');
		document.getElementById('grid-controls')?.classList.toggle('hidden', view !== 'grid');
		document.getElementById('stats-controls')?.classList.toggle('hidden', view !== 'stats');
		document.getElementById('graph-controls')?.classList.toggle('hidden', view !== 'graph');

		if (view === 'stats') {
			renderStatsView();
		} else if (view === 'graph') {
			renderGraphView();
		}
	});
});

document.querySelectorAll('input[name="sort"]').forEach((input) => {
	input.addEventListener('change', (e) => {
		// @ts-ignore
		currentSort = e.target?.value;
		renderGridView();
	});
});

document.getElementById('entrypoint-select')?.addEventListener('change', (e) => {
	// @ts-ignore
	currentEntrypoint = e.target?.value;
	renderStatsView();
});

document.getElementById('graph-entrypoint-select')?.addEventListener('change', (e) => {
	// @ts-ignore
	currentGraphEntrypoint = parseInt(e.target?.value);
	renderGraphView();
});

// Initialize
function init() {
	// Populate entrypoint selectors
	const select = document.getElementById('entrypoint-select');
	const graphSelect = document.getElementById('graph-entrypoint-select');
	if (!(select && graphSelect)) throw new Error("Couldn't find selections");

	chunkLayers.forEach((layer, index) => {
		const option = document.createElement('option');
		option.value = layer.path;
		option.textContent = layer.path.split('/').pop();
		select.appendChild(option);

		const graphOption = document.createElement('option');
		graphOption.value = String(index);
		graphOption.textContent = layer.path.split('/').pop();
		graphSelect.appendChild(graphOption);
	});

	renderGridView();
}

// Wait for data to be available
// @ts-ignore
if (window.metafile) {
	init();
} else {
	window.addEventListener('metafileLoaded', init);
}
