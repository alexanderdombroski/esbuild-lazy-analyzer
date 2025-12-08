import { formatBytes } from './utils.mjs';

// ------------------------------------------------------------ //
// --------------------     GRAPH PAGE     -------------------- //
// ------------------------------------------------------------ //

// Track selected files for graph rendering
let selectedFiles = new Set();
let currentGraphMode = 'files';

function renderNodeList(meta) {
	const grid = document.getElementById('node-list-grid');
	if (!grid) return;
	grid.innerHTML = '';
	const files = Object.keys(meta);
	// If first load, select all files
	if (selectedFiles.size === 0) files.forEach((f) => selectedFiles.add(f));

	// Create custom tooltip element
	let nodeListTooltip = /** @type {HTMLDivElement | null} */ (
		document.querySelector('.node-list-tooltip')
	);
	if (!nodeListTooltip) {
		nodeListTooltip = document.createElement('div');
		nodeListTooltip.className = 'node-list-tooltip';
		document.body.appendChild(nodeListTooltip);
	}

	files.forEach((file) => {
		const label = document.createElement('label');
		label.className = 'node-list-item';
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.checked = selectedFiles.has(file);
		checkbox.className = 'node-list-checkbox';
		checkbox.addEventListener('change', () => {
			if (checkbox.checked) {
				selectedFiles.add(file);
			} else {
				selectedFiles.delete(file);
			}
			// Rerender graph after selection change
			initGraph(currentGraphMode);
		});
		label.appendChild(checkbox);
		const span = document.createElement('span');
		span.textContent = file.split('/').pop() || file;

		// Custom tooltip on hover
		span.addEventListener('mouseenter', () => {
			if (!nodeListTooltip) return;
			nodeListTooltip.textContent = file;
			nodeListTooltip.style.display = 'block';
			const rect = span.getBoundingClientRect();
			nodeListTooltip.style.left = rect.left + 'px';
			nodeListTooltip.style.top = rect.bottom + 5 + 'px';
		});
		span.addEventListener('mouseleave', () => {
			if (!nodeListTooltip) return;
			nodeListTooltip.style.display = 'none';
		});

		label.appendChild(span);
		grid.appendChild(label);
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

/**
 * @param {Object} d
 * @param {string} d.id
 * @param {number} d.size
 * @param {string} d.group
 * @param {string} mode
 */
const nodeTooltipTemplate = ({ id, size, group }, mode) => {
	const base = `${id}<br>Size: ${formatBytes(size)}<br>Type: ${group}`;
	if (mode === 'files') return base;

	const bundledFiles = Object.keys(window.metafile.outputs[id].inputs);
	const entrypoint = window.metafile.outputs[id].entryPoint;
	if (entrypoint && !bundledFiles.includes(entrypoint)) bundledFiles.unshift(entrypoint);
	if (bundledFiles.length === 0) return base;

	const fileList = bundledFiles.map((file) => `<li>${file}</li>`).join('');
	return `${base}<br>Files: <br><ul>${fileList}</ul>`;
};

/** @param {string} mode */
export function initGraph(mode) {
	if (!window.metafile || !window.bundleStats) return;
	if (mode !== currentGraphMode) selectedFiles.clear();
	currentGraphMode = mode;

	// Render node list grid for selection
	const meta = mode === 'files' ? window.metafile.inputs : window.metafile.outputs;
	renderNodeList(meta);

	const svg = d3.select('#graph-svg');
	svg.selectAll('*').remove();

	const container = /** @type {HTMLButtonElement} */ (document.querySelector('.graph-card'));
	const width = container.clientWidth;
	const height = container.clientHeight;

	/** @type {Array<{id: string, group: string, size: number, x?: number, y?: number, fx?: number | null, fy?: number | null}>} */
	const nodes = [];
	const links = [];

	const allEagerImports = new Set();
	const allLazyImports = new Set();

	Object.values(window.bundleStats.entryStats).forEach((entry) => {
		entry.eagerImports.forEach((imp) => allEagerImports.add(imp));
		entry.lazyImports.forEach((imp) => allLazyImports.add(imp));
	});

	const entryPoints = Object.keys(window.bundleStats.entryStats);
	Object.entries(meta).forEach(([path, output]) => {
		if (!selectedFiles.has(path)) return;
		const isEntry = entryPoints.includes(path);
		const isLazy = !allEagerImports.has(path);
		nodes.push({
			id: path,
			group: isEntry ? 'entry' : isLazy ? 'lazy' : 'eager',
			size: output.bytes,
		});

		output.imports.forEach((imp) => {
			if (!imp.external && selectedFiles.has(imp.path)) {
				links.push({
					source: path,
					target: imp.path,
				});
			}
		});
	});

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
			tooltip.style('display', 'block').html(nodeTooltipTemplate(d, mode));
		})
		.on('mousemove', (event) => {
			const tooltipNode = /** @type {HTMLDivElement} */ (tooltip.node());
			const tooltipWidth = tooltipNode.offsetWidth;
			const tooltipHeight = tooltipNode.offsetHeight;

			let left = event.pageX + 16;
			let top = event.pageY - 10;

			// Check right boundary
			if (left + tooltipWidth > window.innerWidth) {
				left = event.pageX - tooltipWidth - 16;
			}
			// Check bottom boundary
			if (top + tooltipHeight > window.innerHeight + window.scrollY) {
				top = event.pageY - tooltipHeight - 10;
			}
			// Check top boundary
			if (top < window.scrollY) {
				top = event.pageY + 10;
			}
			// Check left boundary
			if (left < 0) {
				left = event.pageX + 16;
			}

			tooltip.style('left', left + 'px').style('top', top + 'px');
		})
		.on('mouseout', () => {
			tooltip.style('display', 'none');
		})
		.on('click', (event, d) => {
			event.stopPropagation();
			openNodeModal(d, mode);
		});

	simulation.on('tick', () => {
		link
			.attr('x1', (d) => d.source.x ?? 0)
			.attr('y1', (d) => d.source.y ?? 0)
			.attr('x2', (d) => d.target.x ?? 0)
			.attr('y2', (d) => d.target.y ?? 0);

		node.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0);

		label.attr('x', (d) => d.x ?? 0).attr('y', (d) => d.y ?? 0);
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

// ------------------------------------------------------------ //
// -------------------     MODAL LOGIC     -------------------- //
// ------------------------------------------------------------ //

let currentModalNode = null;

/**
 * Open modal with node details and its import/export graph
 * @param {Object} nodeData
 * @param {string} nodeData.id
 * @param {number} nodeData.size
 * @param {string} nodeData.group
 * @param {string} mode
 */
function openNodeModal(nodeData, mode) {
	currentModalNode = nodeData;
	const modal = /** @type {HTMLElement} */ (document.getElementById('node-modal'));
	const modalTitle = /** @type {HTMLElement} */ (document.getElementById('modal-title'));

	modalTitle.textContent = nodeData.id.split('/').pop() || nodeData.id;
	modal.classList.add('active');

	// Render modal graph
	renderModalGraph(nodeData, mode);
}

export function closeNodeModal() {
	const modal = /** @type {HTMLElement} */ (document.getElementById('node-modal'));
	modal.classList.remove('active');
	currentModalNode = null;
}

export function removeCurrentNode() {
	if (!currentModalNode) return;

	// Remove from selectedFiles
	selectedFiles.delete(currentModalNode.id);

	// Update checkbox in node list
	const checkboxes = /** @type {NodeListOf<HTMLInputElement>} */ (
		document.querySelectorAll('.node-list-checkbox')
	);
	checkboxes.forEach((checkbox) => {
		const label = checkbox.parentElement;
		const span = label?.querySelector('span');
		if (span?.textContent === (currentModalNode.id.split('/').pop() || currentModalNode.id)) {
			checkbox.checked = false;
		}
	});

	// Close modal and re-render graph
	closeNodeModal();
	initGraph(currentGraphMode);
}

/**
 * Render the modal graph showing imports and exports for the selected node
 * @param {Object} nodeData
 * @param {string} nodeData.id
 * @param {number} nodeData.size
 * @param {string} nodeData.group
 * @param {string} mode
 */
function renderModalGraph(nodeData, mode) {
	const svg = d3.select('#modal-graph-svg');
	svg.selectAll('*').remove();

	const container = /** @type {HTMLElement} */ (document.querySelector('.modal-body'));
	const width = container.clientWidth;
	const height = container.clientHeight;

	// Get metadata based on mode
	const meta = mode === 'files' ? window.metafile.inputs : window.metafile.outputs;
	const nodeInfo = meta[nodeData.id];

	if (!nodeInfo) return;

	/** @type {Array<{id: string, group: string, size: number, x?: number, y?: number, fx?: number | null, fy?: number | null}>} */
	const modalNodes = [];
	const modalLinks = [];

	// Add the center node
	modalNodes.push({
		id: nodeData.id,
		group: nodeData.group,
		size: nodeData.size,
	});

	// Add nodes that this node imports
	nodeInfo.imports.forEach((imp) => {
		if (!imp.external && meta[imp.path]) {
			modalNodes.push({
				id: imp.path,
				group: 'import',
				size: meta[imp.path].bytes,
			});
			modalLinks.push({
				source: nodeData.id,
				target: imp.path,
			});
		}
	});

	// Find nodes that import this node
	Object.entries(meta).forEach(([path, info]) => {
		if (path === nodeData.id) return;
		const importsCurrentNode = info.imports.some((imp) => imp.path === nodeData.id);
		if (importsCurrentNode) {
			// Check if this node is already added
			if (!modalNodes.find((n) => n.id === path)) {
				modalNodes.push({
					id: path,
					group: 'importer',
					size: info.bytes,
				});
			}
			modalLinks.push({
				source: path,
				target: nodeData.id,
			});
		}
	});

	const simulation = d3
		.forceSimulation(modalNodes)
		.force(
			'link',
			d3
				.forceLink(modalLinks)
				// @ts-ignore
				.id((d) => d.id)
				.distance(120)
		)
		.force('charge', d3.forceManyBody().strength(-400))
		.force('center', d3.forceCenter(width / 2, height / 2))
		.force(
			'collision',
			// @ts-ignore
			d3.forceCollide().radius((d) => Math.sqrt(d.size) / 20 + 15)
		);

	const g = svg.append('g');

	// Create arrow markers for directed edges
	svg
		.append('defs')
		.append('marker')
		.attr('id', 'arrowhead')
		.attr('viewBox', '0 -5 10 10')
		.attr('refX', 20)
		.attr('refY', 0)
		.attr('markerWidth', 6)
		.attr('markerHeight', 6)
		.attr('orient', 'auto')
		.append('path')
		.attr('d', 'M0,-5L10,0L0,5')
		.attr('fill', 'hsl(215, 20%, 65%)');

	const link = g
		.append('g')
		.selectAll('line')
		.data(modalLinks)
		.join('line')
		.attr('stroke', 'hsl(215, 20%, 65%)')
		.attr('stroke-opacity', 0.6)
		.attr('stroke-width', 2)
		.attr('marker-end', 'url(#arrowhead)');

	const node = g
		.append('g')
		.selectAll('circle')
		.data(modalNodes)
		.join('circle')
		.attr('r', (d) => Math.max(8, Math.sqrt(d.size) / 15))
		.attr('fill', (d) => {
			if (d.id === nodeData.id) return 'var(--primary)';
			if (d.group === 'import') return 'var(--success)';
			if (d.group === 'importer') return 'var(--warning)';
			return d.group === 'entry' ? 'var(--info)' : 'var(--text-secondary)';
		})
		.attr('stroke', (d) => {
			if (d.id === nodeData.id) return 'var(--primary)';
			if (d.group === 'import') return 'var(--success)';
			if (d.group === 'importer') return 'var(--warning)';
			return d.group === 'entry' ? 'var(--info)' : 'var(--text-secondary)';
		})
		.attr('stroke-width', 3)
		.style('cursor', 'pointer')
		// @ts-ignore
		.call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));

	const label = g
		.append('g')
		.selectAll('text')
		.data(modalNodes)
		.join('text')
		.text((d) => d.id.split('/').pop() || d.id)
		.attr('font-size', 11)
		.attr('fill', 'hsl(210, 40%, 98%)')
		.attr('dx', 12)
		.attr('dy', 4)
		.style('pointer-events', 'none');

	// Add tooltip for modal graph
	const modalTooltip = d3.select('body').append('div').attr('class', 'graph-tooltip');

	node
		.on('mouseover', (event, d) => {
			const tooltipContent = `${d.id}<br>Size: ${formatBytes(d.size)}<br>Type: ${d.group}`;
			modalTooltip.style('display', 'block').html(tooltipContent);
		})
		.on('mousemove', (event) => {
			const tooltipNode = /** @type {HTMLDivElement} */ (modalTooltip.node());
			const tooltipWidth = tooltipNode.offsetWidth;
			const tooltipHeight = tooltipNode.offsetHeight;

			let left = event.pageX + 16;
			let top = event.pageY - 10;

			if (left + tooltipWidth > window.innerWidth) {
				left = event.pageX - tooltipWidth - 16;
			}
			if (top + tooltipHeight > window.innerHeight + window.scrollY) {
				top = event.pageY - tooltipHeight - 10;
			}
			if (top < window.scrollY) {
				top = event.pageY + 10;
			}
			if (left < 0) {
				left = event.pageX + 16;
			}

			modalTooltip.style('left', left + 'px').style('top', top + 'px');
		})
		.on('mouseout', () => {
			modalTooltip.style('display', 'none');
		});

	simulation.on('tick', () => {
		link
			.attr('x1', (d) => d.source.x ?? 0)
			.attr('y1', (d) => d.source.y ?? 0)
			.attr('x2', (d) => d.target.x ?? 0)
			.attr('y2', (d) => d.target.y ?? 0);

		node.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0);

		label.attr('x', (d) => d.x ?? 0).attr('y', (d) => d.y ?? 0);
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
