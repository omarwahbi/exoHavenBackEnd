import js from '@eslint/js';
import globals from 'globals';

// Server-side code only; src/admin is built by Strapi's admin bundler.
export default [
  { ignores: ['src/admin/**', 'types/**', 'dist/**', '.strapi/**', 'build/**', 'public/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node, strapi: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
    },
  },
];
