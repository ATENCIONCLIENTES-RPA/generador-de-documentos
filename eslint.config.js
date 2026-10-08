import globals from 'globals';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'public/vendor/**', 'coverage/**', 'reference/**'] },
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: { '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }], '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-expressions': 'off' }
  },
  /* Código legado extraído sin cambios (// @ts-nocheck): ESLint `no-undef` es la red de seguridad contra referencias a variables no declaradas. */
  {
    files: ['src/modules/*/main.ts', 'src/repositories/*.ts', 'src/services/**/xlsx-lite.ts', 'src/services/person-name.ts', 'src/components/**/*.ts'],
    /* AD: lo define module-bridge.ts; celebrate: lo publica el módulo «documentos» con window.celebrate=… */
    languageOptions: { globals: { ...globals.browser, AD: 'readonly', celebrate: 'readonly' } },
    rules: {
      'no-undef': 'error', '@typescript-eslint/ban-ts-comment': 'off', '@typescript-eslint/no-unused-vars': 'off', '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-this-alias': 'off', '@typescript-eslint/no-empty-function': 'off', 'no-empty': 'off', 'no-useless-escape': 'off', 'no-prototype-builtins': 'off',
      'no-cond-assign': 'off', 'no-control-regex': 'off', 'no-misleading-character-class': 'off', 'no-case-declarations': 'off', 'no-fallthrough': 'off', 'no-sparse-arrays': 'off',
      'prefer-const': 'off', 'no-var': 'off', 'no-redeclare': 'off', 'prefer-rest-params': 'off'
    }
  }
);
