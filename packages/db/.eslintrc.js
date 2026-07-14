/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['../config/eslint.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  env: { node: true },
};
