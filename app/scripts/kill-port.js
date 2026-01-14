#!/usr/bin/env node
/**
 * Kill process on specified port - Cross-platform
 * Usage: node scripts/kill-port.js <port>
 */

import { execSync } from 'child_process';
import { platform } from 'os';

const port = process.argv[2];

if (!port) {
  console.error('Usage: node scripts/kill-port.js <port>');
  process.exit(1);
}

console.log(`🔧 Killing process on port ${port}...`);

try {
  if (platform() === 'win32') {
    // Windows: Use netstat + taskkill
    try {
      const netstatOutput = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
      const lines = netstatOutput.split('\n');

      const pids = new Set();
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            pids.add(pid);
          }
        }
      }

      if (pids.size === 0) {
        console.log(`✓ No process found on port ${port}`);
        process.exit(0);
      }

      for (const pid of pids) {
        console.log(`  Killing PID ${pid}...`);
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      }

      console.log(`✓ Killed ${pids.size} process(es) on port ${port}`);
    } catch (e) {
      console.log(`✓ Port ${port} is free`);
    }
  } else {
    // Unix/Mac: Use lsof
    try {
      const lsofOutput = execSync(`lsof -ti :${port}`, { encoding: 'utf-8' });
      const pids = lsofOutput.trim().split('\n').filter(Boolean);

      if (pids.length === 0) {
        console.log(`✓ No process found on port ${port}`);
        process.exit(0);
      }

      for (const pid of pids) {
        console.log(`  Killing PID ${pid}...`);
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
      }

      console.log(`✓ Killed ${pids.length} process(es) on port ${port}`);
    } catch (e) {
      console.log(`✓ Port ${port} is free`);
    }
  }

  process.exit(0);
} catch (error) {
  console.error(`✗ Error killing process on port ${port}:`, error.message);
  process.exit(1);
}
