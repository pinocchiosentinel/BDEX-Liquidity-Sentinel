import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.NODE_ENV === 'production') throw new Error('Refusing to generate or store a wallet in production.');
const require = createRequire(import.meta.url);
const { Wallet } = require('ethers');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wallet = Wallet.createRandom();
const outputDir = resolve(root, '.local-secrets');
await mkdir(outputDir, { recursive: true });
const file = resolve(outputDir, 'bot-testnet-deployer.json');
await writeFile(file, JSON.stringify({ network: 'BOT Chain Testnet', chainId: 968, address: wallet.address, privateKey: wallet.privateKey, warning: 'TESTNET ONLY; private key. Do not share, commit, or reuse.' }, null, 2), { flag: 'wx', mode: 0o600 });
try { await chmod(file, 0o600); } catch { /* Windows ACLs are inherited; file is gitignored. */ }
console.log(`Created a random wallet for BOT Chain testnet (chain 968).\nPUBLIC ADDRESS: ${wallet.address}\nPrivate key saved only to: ${file}\nDo not send the private key in chat. Fund this address with testnet BOT only.`);