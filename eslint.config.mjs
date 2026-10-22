import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from '@next/eslint-plugin-next';
import hooks from 'eslint-plugin-react-hooks';
export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**', 'src/types/database.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.{ts,tsx}'], plugins: { '@next/next': next, 'react-hooks': hooks }, rules: { ...next.configs.recommended.rules, ...next.configs['core-web-vitals'].rules, 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' } },
  { files: ['scripts/*.mjs','*.config.mjs','tests/integration/*.mjs'], languageOptions: { globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly', URL: 'readonly', fetch: 'readonly' } } }
);
