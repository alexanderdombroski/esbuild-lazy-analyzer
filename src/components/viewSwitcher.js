const tabsContainer = document.querySelector('.nav-tabs');

tabsContainer.addEventListener('click', (event) => {
	const clickedButton = event.target.closest('button');
	if (!clickedButton) return;

	const currentActiveButton = tabsContainer.querySelector('.active');
	if (currentActiveButton) {
		currentActiveButton.classList.remove('active');
	}

	clickedButton.classList.add('active');
});
