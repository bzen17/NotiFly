module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'eslint:recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module'
  },
  ignorePatterns: ['.next/', 'node_modules/'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off'
    ,
    // relax a few rules to get the web package lint-clean quickly
    'no-unused-vars': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'react/no-unescaped-entities': 'off',
    'no-undef': 'off',
    'react-hooks/rules-of-hooks': 'off'
  }
};
