module.exports = {
  extends: ['alloy', 'alloy/vue', 'alloy/typescript'],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: {
      js: '@babel/eslint-parser',
      jsx: '@babel/eslint-parser',
      ts: '@typescript-eslint/parser',
      tsx: '@typescript-eslint/parser',
    },
  },
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  globals: {},
  rules: {
    '@typescript-eslint/prefer-optional-chain': 'off',
  },
};
