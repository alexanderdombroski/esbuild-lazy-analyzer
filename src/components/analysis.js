import { initStats } from './scripts/stats.mjs';
import { initGraph, removeCurrentNode, closeNodeModal } from './scripts/graph.mjs';

// ------------------------------------------------------------ //
// --------------------     LOAD LOGIC     -------------------- //
// ------------------------------------------------------------ //

// Modal event listeners
document.getElementById('modal-close-btn')?.addEventListener('click', closeNodeModal);
document.getElementById('modal-remove-btn')?.addEventListener('click', removeCurrentNode);

// Close modal on ESC key
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		const modal = /** @type {HTMLElement} */ (document.getElementById('node-modal'));
		if (modal.classList.contains('active')) {
			closeNodeModal();
		}
	}
});

// Close modal when clicking on the backdrop
document.getElementById('node-modal')?.addEventListener('click', (event) => {
	if (event.target === event.currentTarget) {
		closeNodeModal();
	}
});

// Initialize on load
function initializeAnalyzerPage() {
	const lastTab = localStorage.getItem('analyzer-last-tab') || 'stats';
	// Set active nav and page
	document.querySelectorAll('.nav-link').forEach((l) => {
		if (/** @type {HTMLLinkElement} */ (l).dataset.page === lastTab) {
			l.classList.add('active');
		} else {
			l.classList.remove('active');
		}
	});
	document.querySelectorAll('.page').forEach((p) => {
		if (p.id === `${lastTab}-page`) {
			p.classList.add('active');
		} else {
			p.classList.remove('active');
		}
	});
	// Call appropriate init
	if (lastTab === 'stats') {
		initStats();
	} else {
		initGraph('files');
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeAnalyzerPage);
} else {
	initializeAnalyzerPage();
}
