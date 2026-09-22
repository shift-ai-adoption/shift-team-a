import { spawn } from 'node:child_process';

// Keep API and Vite in one container; terminate both if either process exits.
const children = [
  spawn(process.execPath, ['--experimental-sqlite', 'server/index.mjs'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], { stdio: 'inherit' }),
];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  const timeout = setTimeout(() => {
    for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
  }, 5000);
  timeout.unref();
}
for (const child of children) {
  child.on('error', error => { console.error(error); stop(1); });
  child.on('exit', code => stop(code || 1));
}
process.on('SIGTERM', () => stop(0));
process.on('SIGINT', () => stop(0));
