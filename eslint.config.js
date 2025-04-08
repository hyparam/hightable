import javascript from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import storybook from 'eslint-plugin-storybook'
import globals from 'globals'
import typescript from 'typescript-eslint'

export default typescript.config(
  { ignores: ['coverage/', 'dist/'] },
  {
    extends: [javascript.configs.recommended, ...typescript.configs.strictTypeChecked, ...typescript.configs.stylisticTypeChecked],
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...javascript.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      // javascript
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
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
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
      // typescript
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/require-await': 'warn',
      // allow using any - see row.ts - it's not easy to replace with unknown for example
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // fix an issue with vi.fn in an object (localStorage mock in our tests): see https://github.com/vitest-dev/eslint-plugin-vitest/issues/591
      '@typescript-eslint/unbound-method': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
  {
    files: ['test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/*.js'],
    ...typescript.configs.disableTypeChecked,
  },
  {
    extends: [
      ...storybook.configs['flat/recommended'],
    ],
    files: ['**/*.stories.tsx'],
  }
)
