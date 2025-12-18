import { fileURLToPath } from 'node:url'

import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig } from 'eslint/config'
import importPlugin from 'eslint-plugin-import'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import storybook from 'eslint-plugin-storybook'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

export default defineConfig([
  includeIgnoreFile(gitignorePath, 'Imported .gitignore patterns'),
  {
    // eslint for js and ts files
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: { globals: { ...globals.browser } },
    extends: [
      js.configs.recommended,
    ],
    rules: {
      eqeqeq: 'error',
      'func-style': ['error', 'declaration', { allowTypeAnnotation: true }],
      'prefer-destructuring': ['error', { object: true, array: false },
      ],
    },
  },
  {
    // stylistic rules
    extends: [
      stylistic.configs.recommended,
    ],
    rules: {
      '@stylistic/comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'never',
        },
      ],
      '@stylistic/quote-props': ['error', 'as-needed'],
    },
  },
  {
    // sort the imports
    files: ['**/*.{ts,tsx,js}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
    },
  },
  {
    // ensure imports consistently have an extension
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/extensions': ['error', 'ignorePackages'],
    },
  },
  {
    // typescript only
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    extends: [
      tseslint.configs.strictTypeChecked,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.recommended,
    ],
    rules: {
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-deprecated': 'error',
      // allow using any - see row.ts - it's not easy to replace with unknown for example
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
  {
    // typescript stylistic rules
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.stylisticTypeChecked,
    ],
  },
  {
    // tests only
    files: ['test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      // fix an issue with vi.fn in an object (localStorage mock in our tests): see https://github.com/vitest-dev/eslint-plugin-vitest/issues/591
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    // storybook stories
    files: ['**/*.stories.tsx'],
    extends: [
      storybook.configs['flat/recommended'],
    ],
  },
])
