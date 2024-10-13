import javascript from '@eslint/js'
import typescriptParser from '@typescript-eslint/parser'
import react from 'eslint-plugin-react'
import globals from 'globals'
import typescript from 'typescript-eslint'

export default [
  {
    ignores: ['coverage/', 'dist/'],
  },
  {
    files: ['demo.js', '**/*.ts', '**/*.tsx'],
    plugins: {
      react,
      typescript,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        Babel: 'readonly',
        React: 'readonly',
        ReactDOM: 'readonly',
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      ...javascript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...typescript.configs.eslintRecommended.rules,
      ...typescript.configs.recommended.rules,
      'arrow-spacing': 'error',
      camelcase: 'off',
      'comma-spacing': 'error',
      'comma-dangle': ['error', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never',
      }],
      'eol-last': 'error',
      eqeqeq: 'error',
      'func-style': ['error', 'declaration'],
      indent: ['error', 2],
      'no-constant-condition': 'off',
      'no-extra-parens': 'error',
      'no-multi-spaces': 'error',
      'no-trailing-spaces': 'error',
      'no-undef': 'error',
      'no-unused-vars': 'off',
      'no-useless-concat': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-var': 'error',
      'object-curly-spacing': ['error', 'always'],
      'prefer-const': 'warn',
      'prefer-destructuring': ['warn', {
        object: true,
        array: false,
      }],
      'prefer-promise-reject-errors': 'error',
      quotes: ['error', 'single'],
      'require-await': 'warn',
      semi: ['error', 'never'],

      'sort-imports': ['error', {
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
      }],

      'space-infix-ops': 'error',
    },
  },
]
