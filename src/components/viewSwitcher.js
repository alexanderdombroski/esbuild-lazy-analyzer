const buttons = document.querySelectorAll('.nav-tabs button');
buttons.forEach((btn) =>
	btn.addEventListener('click', () => {
		buttons.forEach((btn) => btn.classList.remove('active'));
		btn.classList.add('active');
		document.querySelectorAll('main > section').forEach((section) => (section.hidden = true));
		const section = document.querySelector(`.${btn.getAttribute('data-section')}`);
		if (section) section.hidden = false;
	})
);
