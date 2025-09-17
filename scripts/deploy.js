#!/usr/bin/env node

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Read JWT_SECRET from .env file
const envContent = readFileSync('.env', 'utf8');
const jwtSecret = envContent.match(/JWT_SECRET=(.+)/)?.[1];

if (!jwtSecret) {
  console.error('JWT_SECRET not found in .env file');
  process.exit(1);
}

// Get environment from command line argument
const env = process.argv[2];
if (!env || !['development', 'production'].includes(env)) {
  console.error('Usage: node scripts/deploy.js [development|production]');
  process.exit(1);
}

console.log(`Deploying to ${env}...`);

try {
  // Build first
  console.log('Building...');
  execSync('pnpm build', { stdio: 'inherit' });
  
  // Deploy with JWT_SECRET
  console.log(`Deploying to ${env}...`);
  execSync(`cd workers && wrangler deploy --env ${env} --var JWT_SECRET:${jwtSecret}`, { 
    stdio: 'inherit',
    env: { ...process.env, JWT_SECRET: jwtSecret }
  });
  
  console.log(`✅ Successfully deployed to ${env}`);
} catch (error) {
  console.error(`❌ Deployment failed:`, error.message);
  process.exit(1);
}