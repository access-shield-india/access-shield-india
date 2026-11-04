/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['../../packages/config/eslint.js'],
  parserOptions: {
    // Includes *.test.ts (excluded from build tsconfig) so typed linting works in the IDE
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  env: { node: true },
  rules: {
    // Express Request augmentation uses `declare global { namespace Express { ... } }`
    '@typescript-eslint/no-namespace': 'off',
    // Allow `import('playwright').Page` style annotations used across the scanner
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', disallowTypeAnnotations: false },
    ],
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/tests/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
