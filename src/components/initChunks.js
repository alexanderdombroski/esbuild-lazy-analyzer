(function initChunks() {
	const container = document.getElementById('chunks-container');
	// @ts-ignore
	const outputs = metafile?.outputs;
	if (container && typeof outputs !== 'undefined') {
		const chunkPaths = Object.keys(outputs);

		// Create a card for each chunk
		chunkPaths.forEach((path) => {
			const chunk = outputs[path];
			const card = document.createElement('div');
			card.className = 'chunk-card';

			const sizeInKB = (chunk.bytes / 1024).toFixed(2);
			const bundledFiles = Object.keys(chunk.inputs);

			let filesList = '';
			if (bundledFiles.length > 0) {
				filesList = `<ul>${bundledFiles.map((file) => `<li>${file}</li>`).join('')}</ul>`;
			}

			card.innerHTML = `
					<div class="chunk-card-header">
						<span class="chunk-path">${path}</span>
						<span class="chunk-size">${sizeInKB} KB</span>
					</div>
					<div class="chunk-card-body">
						<p><strong>Bundled Files (${bundledFiles.length})</strong></p>
						${filesList}
					</div>
				`;
			container.appendChild(card);
		});
	}
})();
