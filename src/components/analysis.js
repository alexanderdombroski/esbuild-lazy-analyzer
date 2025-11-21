/** @type {NodeListOf<HTMLLinkElement>} */ (document.querySelectorAll('.nav-link')).forEach(
	(link) => {
		link.addEventListener('click', () => {
			const page = link.dataset.page;

			// Update nav links
			document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
			link.classList.add('active');

			// Update pages
			document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
			/** @type {HTMLElement} */ (document.getElementById(`${page}-page`)).classList.add('active');

			// Initialize page-specific content
			if (page === 'stats') {
				initStats();
			} else if (page === 'graph') {
				initGraph('files');
			}
		});
	}
);

// Utilities
function formatBytes(bytes) {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Stats Page
function initStats() {
	if (!(bundleStats && metafile)) {
		/** @type {HTMLElement} */ (document.getElementById('stats-cards')).innerHTML =
			'<p style="color: var(--text-secondary);">No bundle data available. Please ensure metafile and bundleStats are defined.</p>';
		return;
	}

	renderStatCards();
	setupPieChart();
	renderPieChart();
	renderBarChart();
	renderEntryChart();
}

function renderStatCards() {
	const stats = bundleStats;
	const cards = [
		{
			title: 'Total Chunks',
			value: stats.numberOfChunks,
			icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
		},
		{
			title: 'Bundle Size',
			value: formatBytes(stats.bundleSize),
			icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
			trend: `${stats.compressionPercentage.toFixed(1)}% compressed`,
			trendType: 'success',
		},
		{
			title: 'Avg Chunk Size',
			value: formatBytes(stats.averageChunkSize),
			icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
		},
		{
			title: 'Entry Points / Entry Files',
			value: Object.keys(stats.entryStats).length,
			icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
		},
		...Object.entries(stats.entryStats)
			.filter(([, { type }]) => type === 'outputs')
			.map(([name, { eagerImportSize }]) => {
				const percent = (eagerImportSize / stats.bundleSize) * 100;
				return {
					title: `Eager import Size: ${name}`,
					value: formatBytes(eagerImportSize),
					icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
					trend: `${percent.toFixed(1)}% eagerly imported`,
					trendType: percent > 60 ? 'warning' : 'success',
				};
			}),
	];

	const container = /** @type {HTMLElement} */ (document.getElementById('stats-cards'));
	container.innerHTML = cards
		.map(
			(card) => `
    <div class="stat-card">
      <div class="stat-card-content">
        <div class="stat-card-info">
          <h3>${card.title}</h3>
          <div class="value">${card.value}</div>
          ${card.trend ? `<div class="trend ${card.trendType || ''}">${card.trend}</div>` : ''}
        </div>
        <div class="stat-card-icon">${card.icon}</div>
      </div>
    </div>
  `
		)
		.join('');
}

let selectedEntryPoint;

function setupPieChart() {
	const entryPoints = Object.entries(bundleStats.entryStats)
		.filter(([, { type }]) => type === 'outputs')
		.map(([entry]) => entry);
	const dropdown = /** @type {HTMLSelectElement} */ (document.getElementById('pie-dropdown'));
	dropdown.innerHTML = entryPoints.map((file) => `<option>${file}</option>`).join('');
	if (entryPoints.length > 1) {
		dropdown.addEventListener('change', () => {
			selectedEntryPoint = dropdown.value;
			renderPieChart();
		});
	} else {
		dropdown.hidden = true;
	}
	selectedEntryPoint = dropdown.value;
}

let pieChart;

function renderPieChart() {
	const totalEager = bundleStats.entryStats[selectedEntryPoint].eagerImportSize;
	const totalLazy = bundleStats.bundleSize - totalEager;

	const ctx = /** @type {import("chart.js").ChartItem} */ (document.getElementById('pieChart'));
	pieChart?.destroy();
	pieChart = new Chart(ctx, {
		type: 'pie',
		data: {
			labels: ['Eager', 'Lazy'],
			datasets: [
				{
					data: [totalEager, totalLazy],
					backgroundColor: ['hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)'],
					borderWidth: 0,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: {
					labels: {
						color: 'hsl(210, 40%, 98%)',
					},
				},
			},
		},
	});
}

let barChart;

function renderBarChart() {
	const chunkData = Object.entries(metafile.outputs)
		.map(([name, output]) => ({
			name: name.split('/').pop() || name,
			size: output.bytes,
		}))
		.sort((a, b) => b.size - a.size)
		.slice(0, 10);

	const ctx = /** @type {import("chart.js").ChartItem} */ (document.getElementById('barChart'));
	barChart?.destroy();
	barChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: chunkData.map((d) => d.name),
			datasets: [
				{
					label: 'Size',
					data: chunkData.map((d) => d.size),
					backgroundColor: 'hsl(188, 95%, 52%)',
					borderRadius: 8,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			scales: {
				y: {
					ticks: {
						color: 'hsl(215, 20%, 65%)',
						callback: function (value) {
							return formatBytes(value);
						},
					},
					grid: {
						color: 'rgba(255, 255, 255, 0.1)',
					},
				},
				x: {
					ticks: {
						color: 'hsl(215, 20%, 65%)',
						maxRotation: 45,
						minRotation: 45,
					},
					grid: {
						display: false,
					},
				},
			},
			plugins: {
				legend: {
					display: false,
				},
				tooltip: {
					callbacks: {
						label: function (context) {
							return formatBytes(context.parsed.y);
						},
					},
				},
			},
		},
	});
}

let entryBarChart;

function renderEntryChart() {
	const stats = bundleStats;
	const entryData = Object.entries(stats.entryStats).map(([name, entry]) => ({
		name: name.split('/').pop() || name,
		eager: entry.eagerImports.length,
		lazy: entry.lazyImports.length,
	}));

	const ctx = /** @type {import("chart.js").ChartItem} */ (document.getElementById('entryChart'));
	entryBarChart?.destroy();
	entryBarChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: entryData.map((d) => d.name),
			datasets: [
				{
					label: 'Eager Imports',
					data: entryData.map((d) => d.eager),
					backgroundColor: 'hsl(142, 76%, 36%)',
					borderRadius: 8,
				},
				{
					label: 'Lazy Imports',
					data: entryData.map((d) => d.lazy),
					backgroundColor: 'hsl(38, 92%, 50%)',
					borderRadius: 8,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			scales: {
				y: {
					ticks: {
						color: 'hsl(215, 20%, 65%)',
					},
					grid: {
						color: 'rgba(255, 255, 255, 0.1)',
					},
				},
				x: {
					ticks: {
						color: 'hsl(215, 20%, 65%)',
					},
					grid: {
						display: false,
					},
				},
			},
			plugins: {
				legend: {
					labels: {
						color: 'hsl(210, 40%, 98%)',
					},
				},
			},
		},
	});
}

document.querySelectorAll('[data-mode]').forEach((btn) => {
	btn.addEventListener('click', () => {
		const dataset = /** @type {HTMLButtonElement} */ (btn).dataset;
		const mode = /** @type {string} */ (dataset.mode);

		document.querySelectorAll('[data-mode]').forEach((b) => {
			b.classList.remove('active');
			b.classList.add('btn-outline');
			b.classList.remove('btn-primary');
		});
		btn.classList.add('active');
		btn.classList.remove('btn-outline');
		btn.classList.add('btn-primary');

		initGraph(mode);
	});
});

/** @param {string} mode */
function initGraph(mode) {
	if (!metafile || !bundleStats) return;

	const svg = d3.select('#graph-svg');
	svg.selectAll('*').remove();

	const container = /** @type {HTMLButtonElement} */ (document.querySelector('.graph-card'));
	const width = container.clientWidth;
	const height = container.clientHeight;

	const nodes = [];
	const links = [];

	const allEagerImports = new Set();
	const allLazyImports = new Set();

	Object.values(bundleStats.entryStats).forEach((entry) => {
		entry.eagerImports.forEach((imp) => allEagerImports.add(imp));
		entry.lazyImports.forEach((imp) => allLazyImports.add(imp));
	});

	const createNodes = /** @param {import("../types").MetafilePart} meta */ (meta) => {
		const entryPoints = Object.keys(bundleStats.entryStats);
		Object.entries(meta).forEach(([path, output]) => {
			const isEntry = entryPoints.includes(path);
			const isLazy = !allEagerImports.has(path);
			nodes.push({
				id: path,
				group: isEntry ? 'entry' : isLazy ? 'lazy' : 'eager',
				size: output.bytes,
			});

			output.imports.forEach((imp) => {
				if (!imp.external) {
					links.push({
						source: path,
						target: imp.path,
					});
				}
			});
		});
	};

	if (mode === 'files') {
		createNodes(metafile.inputs);
	} else {
		createNodes(metafile.outputs);
	}

	const simulation = d3
		.forceSimulation(nodes)
		.force(
			'link',
			d3
				.forceLink(links)
				// @ts-ignore
				.id((d) => d.id)
				.distance(100)
		)
		.force('charge', d3.forceManyBody().strength(-300))
		.force('center', d3.forceCenter(width / 2, height / 2))
		.force(
			'collision',
			// @ts-ignore
			d3.forceCollide().radius((d) => Math.sqrt(d.size) / 20 + 10)
		);

	const g = svg.append('g');

	const link = g
		.append('g')
		.selectAll('line')
		.data(links)
		.join('line')
		.attr('stroke', 'hsl(220, 15%, 20%)')
		.attr('stroke-opacity', 0.6)
		.attr('stroke-width', 1);

	const node = g
		.append('g')
		.selectAll('circle')
		.data(nodes)
		.join('circle')
		.attr('r', (d) => Math.max(5, Math.sqrt(d.size) / 20))
		.attr('fill', (d) =>
			d.group === 'entry' ? 'var(--info)' : d.group === 'eager' ? 'var(--success)' : 'var(--warning'
		)
		.attr('stroke', (d) =>
			d.group === 'entry' ? 'var(--info)' : d.group === 'eager' ? 'var(--success)' : 'var(--warning'
		)
		.attr('stroke-width', 2)
		.style('cursor', 'pointer')
		// @ts-ignore
		.call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));

	const label = g
		.append('g')
		.selectAll('text')
		.data(nodes)
		.join('text')
		.text((d) => d.id.split('/').pop() || d.id)
		.attr('font-size', 10)
		.attr('fill', 'hsl(210, 40%, 98%)')
		.attr('dx', 12)
		.attr('dy', 4)
		.style('pointer-events', 'none');

	// Custom tooltip implementation
	const tooltip = d3.select('body').append('div').attr('class', 'graph-tooltip');

	node
		.on('mouseover', (event, d) => {
			tooltip
				.style('display', 'block')
				.html(`${d.id}<br>Size: ${formatBytes(d.size)}<br>Type: ${d.group}`);
		})
		.on('mousemove', (event) => {
			tooltip.style('left', event.pageX + 16 + 'px').style('top', event.pageY - 10 + 'px');
		})
		.on('mouseout', () => {
			tooltip.style('display', 'none');
		});

	simulation.on('tick', () => {
		link
			.attr('x1', (d) => d.source.x)
			.attr('y1', (d) => d.source.y)
			.attr('x2', (d) => d.target.x)
			.attr('y2', (d) => d.target.y);

		node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);

		label.attr('x', (d) => d.x).attr('y', (d) => d.y);
	});

	const zoom = d3
		.zoom()
		.scaleExtent([0.1, 10])
		.on('zoom', (event) => {
			g.attr('transform', event.transform);
		});

	// @ts-ignore
	svg.call(zoom);

	function dragstarted(event) {
		if (!event.active) simulation.alphaTarget(0.3).restart();
		event.subject.fx = event.subject.x;
		event.subject.fy = event.subject.y;
	}

	function dragged(event) {
		event.subject.fx = event.x;
		event.subject.fy = event.y;
	}

	function dragended(event) {
		if (!event.active) simulation.alphaTarget(0);
		event.subject.fx = null;
		event.subject.fy = null;
	}
}

// Initialize on load
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initStats);
} else {
	initStats();
}
