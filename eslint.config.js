import javascript from '@eslint/js'
import typescript from 'typescript-eslint'
import globals from 'globals'

export default [
  {
    plugins: {
      typescript,
    },

    ignores: ['dist/*'],

    languageOptions: {
      globals: globals.browser,
    },

    rules: {
      ...javascript.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      'arrow-spacing': 'error',
      camelcase: 'off',
      'comma-spacing': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'eol-last': 'error',
      eqeqeq: 'error',
      'func-style': ['error', 'declaration'],
      indent: ['error', 2],
      'no-constant-condition': 'off',
      'no-extra-parens': 'error',
      'no-multi-spaces': 'error',
      'no-trailing-spaces': 'error',
      'no-undef': 'warn',
      'no-unused-vars': 'warn',
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
