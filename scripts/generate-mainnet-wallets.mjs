import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.GENERATE_MAINNET_WALLETS !== '1') throw new Error('Set GENERATE_MAINNET_WALLETS=1 to confirm mainnet wallet generation.');
const chainId = Number(process.env.BOT_CHAIN_ID);
if (!Number.isSafeInteger(chainId) || chainId !== 677) throw new Error('BOT_CHAIN_ID must be 677 for BOT Chain Mainnet.');
const require = createRequire(import.meta.url);
const { Wallet } = require('ethers');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(root, '.local-secrets');
await mkdir(outputDir, { recursive: true });
const file = resolve(outputDir, 'bot-mainnet-wallets.json');
const wallets = [];
for (let i = 0; i < 3; i++) {
  const wallet = Wallet.createRandom();
  wallets.push({ index: i + 1, address: wallet.address, privateKey: wallet.privateKey });
}
await writeFile(file, JSON.stringify({ network: 'BOT Chain Mainnet', chainId, wallets, warning: 'MAINNET; private keys control real funds. Do not share, commit, or reuse.' }, null, 2), { flag: 'wx', mode: 0o600 });
console.log(`Created 3 random wallets for BOT Chain mainnet (chain ${chainId}).`);
console.log('Public addresses (fund these with mainnet BOT):');
for (const w of wallets) console.log(`  Wallet ${w.index}: ${w.address}`);
console.log(`Private keys saved only to: ${file}`);
console.log('Do not send private keys in chat. Do not commit .local-secrets/.');