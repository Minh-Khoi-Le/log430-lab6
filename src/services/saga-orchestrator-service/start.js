#!/usr/bin/env node

/**
 * This is a wrapper script that sets up module aliases before starting the app
 * It's used to ensure proper resolution of imports in the compiled JavaScript
 */

const path = require('path');
const fs = require('fs');

// Log starting details
console.log('Starting saga-orchestrator-service with module aliasing...');
console.log('Current directory:', __dirname);

// Check if shared directory exists in the container
if (!fs.existsSync(path.join(__dirname, 'dist/shared'))) {
  console.error('ERROR: shared directory not found in', path.join(__dirname, 'dist'));
  // List all directories to help with debugging
  console.log('Available directories:', fs.readdirSync(path.join(__dirname, 'dist')));
}

// Register module aliases
require('module-alias/register');

// Register multiple aliases to handle different import styles
require('module-alias').addAliases({
  '@shared': path.join(__dirname, 'dist/shared'),
  '../../shared': path.join(__dirname, 'dist/shared'),
  '../shared': path.join(__dirname, 'dist/shared'),
  '/app/shared': path.join(__dirname, 'dist/shared')
});

// Register tsconfig paths
require('tsconfig-paths').register({
  baseUrl: __dirname,
  paths: {
    '@shared/*': ['dist/shared/*'],
    '../../shared/*': ['dist/shared/*'],
    '../shared/*': ['dist/shared/*'],
    '/app/shared/*': ['dist/shared/*']
  }
});

// Start the actual application
try {
  console.log('Attempting to load server.js...');
  require('./dist/server.js');
} catch (err) {
  console.error('Failed to start application:');
  console.error(err);
  process.exit(1);
}