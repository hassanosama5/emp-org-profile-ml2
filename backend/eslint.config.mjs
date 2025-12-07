// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'dist/**/*',
      'node_modules/**/*',
      'coverage/**/*',
      '**/*.js',
      '**/*.d.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked, // ✅ Changed from recommendedTypeChecked to strictTypeChecked
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module', // ✅ Changed from commonjs to module
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 'latest',
      },
    },
  },
  {
    rules: {
      // ✅ DISABLE overly strict rules causing your errors
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'off', // ✅ Changed from warn to off
      '@typescript-eslint/no-unsafe-call': 'off', // ✅ ADD THIS
      '@typescript-eslint/no-unsafe-member-access': 'off', // ✅ ADD THIS
      '@typescript-eslint/no-unsafe-assignment': 'off', // ✅ ADD THIS
      '@typescript-eslint/no-unsafe-return': 'off', // ✅ ADD THIS

      // ✅ NestJS specific adjustments
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // ✅ Prettier settings
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
          singleQuote: true,
          trailingComma: 'es5',
          printWidth: 100,
          tabWidth: 2,
          semi: true,
        },
      ],

      // ✅ Other useful rules
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
);
