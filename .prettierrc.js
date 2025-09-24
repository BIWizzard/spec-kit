module.exports = {
  // Basic formatting
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'always-multiline',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',

  // Indentation and line length
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,

  // Line endings
  endOfLine: 'lf',

  // Language-specific overrides
  overrides: [
    {
      files: ['*.json', '*.jsonc'],
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: ['*.md', '*.mdx'],
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
    {
      files: ['*.yaml', '*.yml'],
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: ['*.css', '*.scss', '*.less'],
      options: {
        singleQuote: false,
      },
    },
  ],
};