import globals from 'globals';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'public/vendor/**', 'coverage/**'] },
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: { '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }], '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-expressions': 'off' }
  },
  {
    files: ['src/modules/*/main.ts', 'src/repositories/*.ts', 'src/services/**/xlsx-lite.ts', 'src/services/person-name.ts', 'src/components/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, AD: 'readonly', celebrate: 'readonly' } },
    rules: {
      'no-undef': 'error', '@typescript-eslint/ban-ts-comment': 'off', '@typescript-eslint/no-unused-vars': 'off', '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-this-alias': 'off', '@typescript-eslint/no-empty-function': 'off', 'no-empty': 'off', 'no-useless-escape': 'off', 'no-prototype-builtins': 'off',
      'no-cond-assign': 'off', 'no-control-regex': 'off', 'no-misleading-character-class': 'off', 'no-case-declarations': 'off', 'no-fallthrough': 'off', 'no-sparse-arrays': 'off',
      'prefer-const': 'off', 'no-var': 'off', 'no-redeclare': 'off', 'prefer-rest-params': 'off'
    }
  },
  {
    files: ['src/modules/extractor/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      'no-undef': 'error', '@typescript-eslint/no-unused-vars': 'off', '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/ban-ts-comment': 'off', '@typescript-eslint/no-this-alias': 'off', '@typescript-eslint/no-empty-function': 'off', '@typescript-eslint/no-unsafe-*': 'off',
      'no-empty': 'off', 'no-useless-escape': 'off', 'no-prototype-builtins': 'off', 'no-cond-assign': 'off', 'no-control-regex': 'off',
      'no-misleading-character-class': 'off', 'no-case-declarations': 'off', 'no-fallthrough': 'off', 'no-sparse-arrays': 'off',
      'prefer-const': 'off', 'no-var': 'off', 'no-redeclare': 'off', 'prefer-rest-params': 'off', 'no-inner-declarations': 'off', 'no-unused-labels': 'off', 'no-self-assign': 'off'
    }
  }
);
