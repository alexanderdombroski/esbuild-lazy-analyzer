module.exports = {
	'*.ts': (stagedFiles) => [
		`prettier --write ${stagedFiles.join(' ')}`,
		`eslint --max-warnings=0 ${stagedFiles.join(' ')}`,
	],
	'*.{js,html,css,md}': (stagedFiles) => [
		`prettier --write ${stagedFiles.join(' ')}`,
	],
};
