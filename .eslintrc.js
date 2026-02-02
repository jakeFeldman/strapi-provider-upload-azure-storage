module.exports = {
    env: {
        es2022: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
        '@typescript-eslint/no-unused-vars': [
            'error',
            { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
        ],
        'no-unused-vars': 'off',
        'no-console': [
            'error',
            {
                allow: ['warn', 'error', 'info'],
            },
        ],
        'prettier/prettier': [
            'error',
            {
                arrowParens: 'always',
                bracketSpacing: true,
                endOfLine: 'lf',
                printWidth: 100,
                semi: true,
                singleQuote: true,
                tabWidth: 4,
                trailingComma: 'es5',
                useTabs: false,
            },
        ],
    },
    ignorePatterns: ['dist/', 'node_modules/'],
};
