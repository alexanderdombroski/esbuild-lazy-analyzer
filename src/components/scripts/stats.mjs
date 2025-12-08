import { formatBytes } from './utils.mjs';
import { initGraph } from './graph.mjs';

// ------------------------------------------------------------ //
// --------------------     STATS PAGE     -------------------- //
// ------------------------------------------------------------ //

/** @type {NodeListOf<HTMLLinkElement>} */ (document.querySelectorAll('.nav-link')).forEach(
	(link) => {
		link.addEventListener('click', () => {
			const page = link.dataset.page;
			// Store last visited tab in localStorage
			localStorage.setItem('analyzer-last-tab', page ?? 'stats');

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

// Stats Page
export function initStats() {
	if (!(window.bundleStats && window.metafile)) {
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
	const stats = window.bundleStats;
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
	const entryPoints = Object.entries(window.bundleStats.entryStats)
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
	const totalEager = window.bundleStats.entryStats[selectedEntryPoint].eagerImportSize;
	const totalLazy = window.bundleStats.bundleSize - totalEager;

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
	const chunkData = Object.entries(window.metafile.outputs)
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
	const stats = window.bundleStats;
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
