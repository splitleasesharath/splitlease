#!/usr/bin/env node
const { execSync } = require('child_process');

const port = process.argv[2];
if (!port) {
  console.error('Usage: node kill-port.js <port>');
  process.exit(1);
}

try {
  if (process.platform === 'win32') {
    // Windows: Find and kill process using port
    const cmd = `netstat -ano | findstr :${port}`;
    const result = execSync(cmd, { encoding: 'utf8' });
    const lines = result.split('\n');

    const pids = new Set();
    lines.forEach(line => {
      const match = line.match(/LISTENING\s+(\d+)/);
      if (match) pids.add(match[1]);
    });

    pids.forEach(pid => {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`Killed process ${pid} on port ${port}`);
      } catch (e) {
        // Process might have already exited
      }
    });
  } else {
    // Unix: Use lsof
    const cmd = `lsof -ti:${port}`;
    const result = execSync(cmd, { encoding: 'utf8' });
    const pids = result.trim().split('\n').filter(Boolean);

    pids.forEach(pid => {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
      console.log(`Killed process ${pid} on port ${port}`);
    });
  }

  console.log(`Port ${port} is now free`);
} catch (e) {
  // Port might already be free
  console.log(`No process found on port ${port}`);
}
