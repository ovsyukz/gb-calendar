import globals from 'globals';

export default [
  {
    ignores: ['gbcal/**', 'node_modules/**', '.netlify/**'],
  },
  {
    // Browser code: ES modules, no bundler, no Node globals.
    files: ['public/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    // Server code: Netlify Functions and scripts run on Node.
    files: ['netlify/**/*.js', 'scripts/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.vitest },
    },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
];
