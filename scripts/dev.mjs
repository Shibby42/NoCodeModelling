import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGINT');
  setTimeout(() => process.exit(code), 500).unref();
}
function launch(command, args) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', error => { console.error(`Start fehlgeschlagen: ${command}: ${error.message}`); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
  return child;
}
const python = process.env.SIGNAL_STUDIO_PYTHON || (process.platform === 'win32' ? 'py' : 'python3');
launch(python, [...(python === 'py' ? ['-3'] : []), 'server/app.py']);
launch(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort', ...process.argv.slice(2)]);
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
