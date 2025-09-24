module.exports = {
  // TypeScript and JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'prettier --write',
    'eslint --fix',
    'git add',
  ],

  // Backend TypeScript files
  'backend/**/*.{ts,js}': [
    'cd backend && npm run lint:fix',
    'cd backend && npm run type-check',
    'git add',
  ],

  // Frontend TypeScript/React files
  'frontend/**/*.{ts,tsx,js,jsx}': [
    'cd frontend && npm run lint:fix',
    'cd frontend && npm run type-check',
    'git add',
  ],

  // JSON files
  '*.{json,jsonc}': [
    'prettier --write',
    'git add',
  ],

  // Markdown files
  '*.{md,mdx}': [
    'prettier --write',
    'git add',
  ],

  // CSS/SCSS files
  '*.{css,scss,less}': [
    'prettier --write',
    'git add',
  ],

  // YAML files
  '*.{yml,yaml}': [
    'prettier --write',
    'git add',
  ],

  // Package.json files
  'package.json': [
    'npm run format',
    'git add',
  ],

  // Prisma schema files
  'backend/prisma/schema.prisma': [
    'cd backend && npx prisma format',
    'git add',
  ],

  // Configuration files
  '*.config.{js,ts}': [
    'prettier --write',
    'git add',
  ],
};