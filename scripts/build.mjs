import { createHash, createPublicKey } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'docs');
const args = process.argv.slice(2);
const createKey = args.includes('--create-key');

function argumentValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

const keyPath = path.resolve(
  argumentValue('--key') || process.env.SYC_SIGNING_KEY || path.join(root, '.secrets', 'school-youtube-cleaner.pem'),
);
const publicBaseUrl = (argumentValue('--base-url') || 'https://cyreiner-ui.github.io/school-youtube-cleaner').replace(/\/$/, '');

function findChrome() {
  const candidates = process.platform === 'win32'
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      ]
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];

  const override = argumentValue('--chrome') || process.env.CHROME_PATH;
  const match = [override, ...candidates].filter(Boolean).find(existsSync);
  if (!match) throw new Error('Google Chrome was not found. Set CHROME_PATH or pass --chrome <path>.');
  return match;
}

function extensionIdFromPem(pem) {
  const publicDer = createPublicKey(pem).export({ type: 'spki', format: 'der' });
  const first16 = createHash('sha256').update(publicDer).digest().subarray(0, 16);
  return [...first16]
    .flatMap((byte) => [byte >> 4, byte & 15])
    .map((nibble) => String.fromCharCode('a'.charCodeAt(0) + nibble))
    .join('');
}

async function main() {
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  const expectedUpdateUrl = `${publicBaseUrl}/update.xml`;
  if (manifest.manifest_version !== 3) throw new Error('manifest.json must remain Manifest V3.');
  if (manifest.update_url !== expectedUpdateUrl) {
    throw new Error(`manifest.json update_url must be ${expectedUpdateUrl}`);
  }
  if (!/^\d+(\.\d+){0,3}$/.test(manifest.version)) throw new Error('Invalid Chrome extension version.');
  if (createKey && existsSync(keyPath)) throw new Error(`Refusing to replace the existing signing key: ${keyPath}`);
  if (!createKey && !existsSync(keyPath)) {
    throw new Error(`Signing key not found: ${keyPath}\nRestore the permanent key; never generate a replacement for an existing deployment.`);
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'school-youtube-cleaner-'));
  const extensionDir = path.join(tempDir, 'extension');
  try {
    await mkdir(extensionDir, { recursive: true });
    for (const filename of ['manifest.json', 'cleaner.js', 'cleaner.css']) {
      await copyFile(path.join(root, filename), path.join(extensionDir, filename));
    }
    await cp(path.join(root, 'icons'), path.join(extensionDir, 'icons'), { recursive: true });

    const chromeArgs = [`--pack-extension=${extensionDir}`];
    if (!createKey) chromeArgs.push(`--pack-extension-key=${keyPath}`);
    const result = spawnSync(findChrome(), chromeArgs, { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) {
      throw new Error(`Chrome packaging failed (${result.status}).\n${result.stdout || ''}\n${result.stderr || ''}`);
    }

    const packedCrx = `${extensionDir}.crx`;
    const generatedKey = `${extensionDir}.pem`;
    if (!existsSync(packedCrx)) throw new Error('Chrome did not create a CRX package.');
    if (createKey) {
      if (!existsSync(generatedKey)) throw new Error('Chrome did not create the initial signing key.');
      await mkdir(path.dirname(keyPath), { recursive: true });
      await copyFile(generatedKey, keyPath);
      await chmod(keyPath, 0o600);
    }

    const pem = await readFile(keyPath, 'utf8');
    const extensionId = extensionIdFromPem(pem);
    const crxUrl = `${publicBaseUrl}/school-youtube-cleaner.crx`;
    const updateXml = `<?xml version="1.0" encoding="UTF-8"?>\n<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">\n  <app appid="${extensionId}">\n    <updatecheck codebase="${crxUrl}" version="${manifest.version}" />\n  </app>\n</gupdate>\n`;
    const indexHtml = `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>School YouTube Cleaner</title></head>\n<body><main><h1>School YouTube Cleaner</h1><p>Managed Chrome extension update host.</p><ul><li><a href="school-youtube-cleaner.crx">CRX package</a></li><li><a href="update.xml">Update manifest</a></li></ul><p>Extension ID: <code>${extensionId}</code></p><p>Version: <code>${manifest.version}</code></p></main></body>\n</html>\n`;

    await mkdir(docsDir, { recursive: true });
    await copyFile(packedCrx, path.join(docsDir, 'school-youtube-cleaner.crx'));
    await writeFile(path.join(docsDir, 'update.xml'), updateXml, 'utf8');
    await writeFile(path.join(docsDir, 'index.html'), indexHtml, 'utf8');
    await writeFile(path.join(docsDir, '.nojekyll'), '', 'utf8');

    console.log(`Extension ID: ${extensionId}`);
    console.log(`Version: ${manifest.version}`);
    console.log(`CRX: ${path.join(docsDir, 'school-youtube-cleaner.crx')}`);
    console.log(`Update manifest: ${path.join(docsDir, 'update.xml')}`);
    console.log(`Signing key: ${keyPath}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

await main();

