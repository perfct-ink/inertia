import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'dist-electron/**', 'node_modules/**', 'ios/**', 'build/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      // React Compiler advisories (react-hooks v7): fixing them means editing
      // working code, so they stay warnings to be addressed deliberately.
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      // Native dialogs and raw HTML controls are off limits (docs/rules/code-requirements.md,
      // ui-organization.md): use Modal/ConfirmDialog/PromptDialog and the @/components/ui
      // primitives, which are the only place a raw control may appear (next block).
      'no-alert': 'error',
      'react/forbid-elements': ['error', {
        forbid: [
          { element: 'button', message: 'Use Button from @/components/ui.' },
          { element: 'input', message: 'Use Input from @/components/ui.' },
          { element: 'select', message: 'Use Select from @/components/ui.' },
          { element: 'textarea', message: 'Use Textarea from @/components/ui.' },
        ],
      }],
    },
  },
  {
    files: ['src/components/ui/**/*.tsx', 'src/**/*.test.tsx'],
    rules: { 'react/forbid-elements': 'off', 'no-alert': 'off' },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'jest.setup.js', 'test/**'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
)
