import { createHash, createPublicKey } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const cleanerJs = await readFile(path.join(root, 'cleaner.js'), 'utf8');
const cleanerCss = await readFile(path.join(root, 'cleaner.css'), 'utf8');
const updateXml = await readFile(path.join(root, 'docs', 'update.xml'), 'utf8');
const crx = await readFile(path.join(root, 'docs', 'school-youtube-cleaner.crx'));
const keyPath = path.resolve(process.env.SYC_SIGNING_KEY || path.join(root, '.secrets', 'school-youtube-cleaner.pem'));
const pem = await readFile(keyPath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const publicDer = createPublicKey(pem).export({ type: 'spki', format: 'der' });
const extensionId = [...createHash('sha256').update(publicDer).digest().subarray(0, 16)]
  .flatMap((byte) => [byte >> 4, byte & 15])
  .map((nibble) => String.fromCharCode(97 + nibble))
  .join('');

assert(manifest.manifest_version === 3, 'Manifest must remain V3.');
assert(manifest.update_url === 'https://cyreiner-ui.github.io/school-youtube-cleaner/update.xml', 'Unexpected update_url.');
assert(manifest.content_scripts?.length === 1, 'Expected one content script.');
assert(!manifest.permissions && !manifest.host_permissions, 'The extension must not request unnecessary permissions.');
for (const expected of ['#related', '.ytp-endscreen-content', '.ytp-ce-element', 'ytd-merch-shelf-renderer']) {
  assert(cleanerCss.includes(expected) || cleanerJs.includes(expected), `Missing intended selector: ${expected}`);
}
for (const preserved of ['comments', 'shorts', 'search']) {
  assert(!new RegExp(`hide[^\\n]{0,30}${preserved}`, 'i').test(cleanerJs + cleanerCss), `Unexpected ${preserved} hiding behavior.`);
}
assert(crx.subarray(0, 4).toString('ascii') === 'Cr24', 'CRX magic header is invalid.');
assert(crx.readUInt32LE(4) === 3, 'Expected a CRX3 package.');
assert(updateXml.includes(`appid="${extensionId}"`), 'update.xml does not match the permanent signing key.');
assert(updateXml.includes(`version="${manifest.version}"`), 'update.xml version does not match manifest.json.');
assert(updateXml.includes('codebase="https://cyreiner-ui.github.io/school-youtube-cleaner/school-youtube-cleaner.crx"'), 'Unexpected CRX URL.');

console.log(`Validated Manifest V3 source, CRX3 package, update manifest, and extension ID ${extensionId}.`);

