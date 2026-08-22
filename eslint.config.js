import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {ignores: ['node_modules/**', 'output/**', 'public/**', '.cache/**']},
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {...globals.node, ...globals.browser},
      parserOptions: {projectService: true, tsconfigRootDir: import.meta.dirname},
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
      'no-restricted-properties': [
        'error',
        {object: 'Math', property: 'random', message: 'Use SeededPrng.'},
      ],
    },
  },
  {
    files: ['src/render/**/*.{ts,tsx}', 'src/game/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'requestAnimationFrame'],
    },
  },
);
