import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.GENERATE_MAINNET_WALLET !== '1') throw new Error('Set GENERATE_MAINNET_WALLET=1 to confirm mainnet wallet generation.');
const chainId = Number(process.env.BOT_CHAIN_ID);
if (!Number.isSafeInteger(chainId) || chainId <= 0 || chainId === 968) throw new Error('Set BOT_CHAIN_ID to the intended mainnet chain ID (must not be testnet 968).');
const require = createRequire(import.meta.url);
const { Wallet } = require('ethers');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wallet = Wallet.createRandom();
const outputDir = resolve(root, '.local-secrets');
await mkdir(outputDir, { recursive: true });
const file = resolve(outputDir, 'bot-mainnet-deployer.json');
await writeFile(file, JSON.stringify({ network: 'BOT Chain Mainnet', chainId, address: wallet.address, privateKey: wallet.privateKey, warning: 'MAINNET; private key controls real funds. Do not share, commit, or reuse.' }, null, 2), { flag: 'wx', mode: 0o600 });
try { await chmod(file, 0o600); } catch { /* Windows ACLs are inherited; file is gitignored. */ }
console.log(`Created a random wallet for BOT Chain mainnet (chain ${chainId}). PUBLIC ADDRESS: ${wallet.address}. Private key saved only to: ${file}. Do not send the private key in chat. Fund this address with mainnet BOT only.`);