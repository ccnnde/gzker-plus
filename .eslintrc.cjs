module.exports = {
  plugins: ['simple-import-sort', 'import'],
  extends: [
    'alloy',
    'alloy/vue',
    'alloy/typescript',
    'plugin:import/recommended',
    'plugin:import/typescript',
    '@unocss',
  ],
  settings: {
    'import/resolver': {
      /**
       * fix alias `@/` unresolved error
       * - this loads `<rootdir>/tsconfig.json` to eslint
       * - https://github.com/import-js/eslint-plugin-import/issues/1485#issuecomment-535351922
       */
      typescript: {},
    },
  },
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
    'object-shorthand': ['error', 'always'],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/prefer-optional-chain': 'off',
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          // Packages. `vue` related packages come first.
          ['^vue', '^@vue', 'pinia', '^vite$', '^@vitejs', '^vite-plugin', '^unocss$', '^@unocss', '^@?\\w'],
          // Node.js builtins.
          ['^node:'],
          // Internal packages.
          [
            '^@/pages(/.*|$)',
            '^@/layout(/.*|$)',
            '^@/views(/.*|$)',
            '^@/components(/.*|$)',
            '^@/i18n(/.*|$)',
            '^@/router(/.*|$)',
            '^@/stores(/.*|$)',
            '^@/api(/.*|$)',
            '^@/utils(/.*|$)',
            '^@/constants(/.*|$)',
            '^@/icons(/.*|$)',
            '^@/styles(/.*|$)',
          ],
          // Assets
          ['^@/assets(/.*|$)'],
          // Parent imports. Put `..` last.
          ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
          // Other relative imports. Put same-folder imports and `.` last.
          ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
          // Style imports.
          ['^.+\\.s?css$'],
          // Side effect imports.
          ['^\\u0000'],
        ],
      },
    ],
    'simple-import-sort/exports': 'error',
    'import/no-deprecated': 'error',
    'import/no-empty-named-blocks': 'error',
    'import/no-mutable-exports': 'error',
    'import/no-named-as-default': 'error',
    'import/no-named-as-default-member': 'error',
    'import/no-absolute-path': 'error',
    'import/no-dynamic-require': 'error',
    'import/no-self-import': 'error',
    'import/no-unresolved': [
      'error',
      {
        ignore: ['^virtual:'],
      },
    ],
    'import/no-useless-path-segments': [
      'error',
      {
        noUselessIndex: true,
      },
    ],
    'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    'import/exports-last': 'error',
    'import/first': 'error',
    'import/newline-after-import': [
      'error',
      {
        count: 1,
        considerComments: true,
      },
    ],
    'import/no-anonymous-default-export': 'error',
    'import/no-duplicates': 'error',
    'import/no-named-default': 'error',
    'import/no-unassigned-import': [
      'error',
      {
        allow: ['**/*.{css,scss}', '**/styles', 'element-plus/**/style/css'],
      },
    ],
  },
};
