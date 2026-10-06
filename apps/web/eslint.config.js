import eslint from '@eslint/js';
import pluginQuery from '@tanstack/eslint-plugin-query';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const designValue = String.raw`/\[#|\b(text|rounded|shadow)-\[/`;

const deepImports = {
  group: [
    '@/api/*',
    '@/components/*/*',
    '!@/components/ui/*',
    '@/hooks/*',
    '@/lib/*',
    '!@/lib/utils',
    '@/providers/*',
    '@/routes/*',
  ],
  message: 'Import from the folder barrel instead.',
};

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...pluginQuery.configs['flat/recommended'],
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Call the API through a function in src/api.',
        },
      ],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/api',
              allowTypeImports: true,
              message: 'Call the API through a hook in src/hooks.',
            },
          ],
          patterns: [deepImports],
        },
      ],
    },
  },
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/components/ui/**', 'src/**/*.test.tsx'],
    rules: {
      'max-lines': ['error', { max: 150, skipBlankLines: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${designValue}], TemplateElement[value.raw=${designValue}]`,
          message:
            'Use a theme token from src/index.css instead of a hex colour or an arbitrary text, radius, or shadow value.',
        },
        {
          selector:
            "JSXAttribute[name.name='className'] > JSXExpressionContainer > TemplateLiteral",
          message: 'Combine conditional classes with cn from @/lib/utils.',
        },
      ],
    },
  },
  {
    files: ['src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['src/api/**/*.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    files: ['src/hooks/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [deepImports] },
      ],
    },
  },
);
