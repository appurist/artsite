/**
 * Database migration runner for D1
 * Usage: node scripts/migrate.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This would be run via wrangler d1 execute command
// For now, this is a template that shows how to apply migrations

const migrationsDir = path.join(__dirname, '..', 'migrations');

function getMigrationFiles() {
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  return files.map(file => ({
    filename: file,
    path: path.join(migrationsDir, file),
    content: fs.readFileSync(path.join(migrationsDir, file), 'utf8')
  }));
}

function generateWranglerCommands() {
  const migrations = getMigrationFiles();
  
  console.log('# Run these commands to apply migrations to your D1 database:');
  console.log('# Replace "artsite-db" with your actual database name\n');
  
  migrations.forEach(migration => {
    console.log(`echo "Applying migration: ${migration.filename}"`);
    console.log(`wrangler d1 execute artsite-db --file=${migration.path}`);
    console.log('');
  });
  
  console.log('# Or run all migrations at once:');
  const allFiles = migrations.map(m => m.path).join(' ');
  console.log(`wrangler d1 execute artsite-db --file=${allFiles}`);
}

// Generate the commands
generateWranglerCommands();