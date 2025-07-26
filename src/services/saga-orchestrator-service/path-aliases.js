/**
 * This file enables path alias resolution at runtime
 * It maps the TypeScript path aliases to their runtime equivalents
 */
require('module-alias/register');

// Register module aliases
require('module-alias').addAliases({
  '@shared': __dirname + '/shared'
});

// Register tsconfig paths (alternative method)
require('tsconfig-paths').register({
  baseUrl: __dirname,
  paths: {
    '@shared/*': ['shared/*']
  }
});