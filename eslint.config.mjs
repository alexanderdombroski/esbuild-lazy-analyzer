import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

export default [
	importPlugin.flatConfigs.typescript,
	{
		ignores: ['node_modules/**', 'dist/**'],
	},
	{
		files: ['**/*.ts'],
	},
	{
		plugins: {
			'@typescript-eslint': typescriptEslint,
		},

		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2022,
			sourceType: 'module',
		},

		rules: {
			'@typescript-eslint/naming-convention': [
				'warn',
				{
					selector: 'import',
					format: ['camelCase', 'PascalCase'],
				},
			],

			'import/extensions': [
				'error',
				'never',
				{
					ts: 'never',
					js: 'always',
					mjs: 'always',
				},
			],

			'no-unused-vars': ['warn', { vars: 'all', args: 'after-used', ignoreRestSiblings: false }],
			eqeqeq: 'warn',
			'no-throw-literal': 'warn',
			semi: 'warn',
		},
	},
	{
		files: ['**/*.d.ts'],
		rules: {
			'no-unused-vars': 'off',
		},
	},
];
