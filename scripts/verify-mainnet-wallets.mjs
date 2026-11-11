import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const chainId = Number(process.env.BOT_CHAIN_ID);
if (!Number.isSafeInteger(chainId) || chainId !== 677) throw new Error('BOT_CHAIN_ID must be 677 for BOT Chain Mainnet.');
const rpcUrl = process.env.BOT_RPC_URL;
if (!rpcUrl || rpcUrl !== 'https://rpc.botchain.ai') throw new Error('Mainnet verification requires BOT_RPC_URL=https://rpc.botchain.ai');
const require = createRequire(import.meta.url);
const { JsonRpcProvider, Wallet, Contract } = require('ethers');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryAddress = '0x4004Fe0bB0625A4B090DF69Cc6fff7F8c89e91a9';
const registryAbi = [
  'function owner() view returns (address)',
  'function publishers(address) view returns (bool)',
  'function publishedAt(bytes32) view returns (uint64)'
];
const secretFile = resolve(root, '.local-secrets/bot-mainnet-wallets.json');
const secret = JSON.parse(await readFile(secretFile, 'utf8'));
if (secret.network !== 'BOT Chain Mainnet' || secret.chainId !== 677) throw new Error('Wallet file is not for BOT mainnet chain 677.');
const provider = new JsonRpcProvider(rpcUrl, 677, { staticNetwork: true });
const network = await provider.getNetwork();
if (network.chainId !== 677n) throw new Error(`RPC chainId is ${network.chainId}, expected 677`);
const contract = new Contract(registryAddress, registryAbi, provider);
const owner = await contract.owner();
console.log(`Verifying ${secret.wallets.length} mainnet wallets against AnalyticsRegistry at ${registryAddress} on BOT Chain Mainnet (677).`);
console.log(`Contract owner: ${owner}`);
console.log('');
for (const w of secret.wallets) {
  const wallet = new Wallet(w.privateKey, provider);
  const address = await wallet.getAddress();
  if (address.toLowerCase() !== w.address.toLowerCase()) throw new Error(`Wallet ${w.index} address mismatch in key file.`);
  const isPublisher = await contract.publishers(address);
  const balance = await provider.getBalance(address);
  console.log(`Wallet ${w.index}: ${address}`);
  console.log(`  Balance: ${balance.toString()} wei`);
  console.log(`  Is publisher: ${isPublisher}`);
  console.log(`  Can read contract: YES`);
}
console.log('');
console.log('All wallets verified: can connect to mainnet RPC, read contract state, and match saved keys.');