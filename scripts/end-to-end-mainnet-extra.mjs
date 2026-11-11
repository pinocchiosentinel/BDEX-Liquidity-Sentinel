import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keccak256, toUtf8Bytes } from 'ethers';

const chainId = Number(process.env.BOT_CHAIN_ID);
if (!Number.isSafeInteger(chainId) || chainId !== 677) throw new Error('BOT_CHAIN_ID must be 677 for BOT Chain Mainnet.');
const rpcUrl = process.env.BOT_RPC_URL;
if (!rpcUrl || rpcUrl !== 'https://rpc.botchain.ai') throw new Error('Mainnet requires BOT_RPC_URL=https://rpc.botchain.ai');
if (process.env.END_TO_END_MAINNET_EXTRA !== '1') throw new Error('Set END_TO_END_MAINNET_EXTRA=1 to confirm broadcasting additional mainnet transactions.');

const require = createRequire(import.meta.url);
const { JsonRpcProvider, Wallet, Contract } = require('ethers');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const registryAddress = '0x4004Fe0bB0625A4B090DF69Cc6fff7F8c89e91a9';
const registryAbi = [
  'function owner() view returns (address)',
  'function publishers(address) view returns (bool)',
  'function publishedAt(bytes32) view returns (uint64)',
  'function setPublisher(address publisher, bool enabled) external',
  'function publish(bytes32 contentHash) external'
];

const walletSecret = JSON.parse(await readFile(resolve(root, '.local-secrets/bot-mainnet-wallets.json'), 'utf8'));
if (walletSecret.network !== 'BOT Chain Mainnet' || walletSecret.chainId !== 677) throw new Error('Wallet file not for BOT mainnet 677.');
const ownerSecret = JSON.parse(await readFile(resolve(root, '.local-secrets/bot-mainnet-deployer.json'), 'utf8'));
if (ownerSecret.network !== 'BOT Chain Mainnet' || ownerSecret.chainId !== 677) throw new Error('Deployer key file not for BOT mainnet 677.');

const provider = new JsonRpcProvider(rpcUrl, 677, { staticNetwork: true });
const network = await provider.getNetwork();
if (network.chainId !== 677n) throw new Error(`RPC chainId ${network.chainId}, expected 677`);

const w1 = new Wallet(walletSecret.wallets[0].privateKey, provider);
const w2 = new Wallet(walletSecret.wallets[1].privateKey, provider);
const w3 = new Wallet(walletSecret.wallets[2].privateKey, provider);
const owner = new Wallet(ownerSecret.privateKey, provider);

const contract = new Contract(registryAddress, registryAbi, provider);
const contractOwner = await contract.owner();
if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) throw new Error('Deployer key is not the contract owner.');
console.log(`Contract owner verified: ${contractOwner}`);

const p1 = await contract.publishers(w1.address);
const p2 = await contract.publishers(w2.address);
const p3 = await contract.publishers(w3.address);
console.log(`Publisher status: Wallet 1=${p1}, Wallet 2=${p2}, Wallet 3=${p3}`);

if (!p1) throw new Error('Wallet 1 is not a publisher — cannot publish.');
if (!p2) throw new Error('Wallet 2 is not a publisher — cannot publish.');

const txResults = [];

async function sendAndWait(label, tx) {
  console.log(`\n[${txResults.length + 1}/2] ${label}`);
  console.log(`  From: ${tx.from}`);
  console.log(`  To:   ${tx.to}`);
  if (tx.data) console.log(`  Data: ${tx.data.slice(0, 66)}...`);
  const sent = await tx;
  const receipt = await sent.wait(1);
  console.log(`  Tx hash: ${sent.hash}`);
  console.log(`  Block: ${receipt.blockNumber}, Status: ${receipt.status}`);
  txResults.push({ label, hash: sent.hash, block: receipt.blockNumber, status: receipt.status });
  if (receipt.status !== 1) throw new Error(`Transaction failed: ${sent.hash}`);
  return receipt;
}

// Tx 7: Wallet 1 -> publish(contentHash3)
const hash3 = keccak256(toUtf8Bytes('bdex-mainnet-wallet-1-attestation-extra-' + Date.now()));
const contractWithW1 = contract.connect(w1);
await sendAndWait('Contract: Wallet 1 publish(bytes32) #2', contractWithW1.publish(hash3));

// Tx 8: Wallet 2 -> publish(contentHash4)
const hash4 = keccak256(toUtf8Bytes('bdex-mainnet-wallet-2-attestation-extra-' + Date.now()));
const contractWithW2 = contract.connect(w2);
await sendAndWait('Contract: Wallet 2 publish(bytes32) #2', contractWithW2.publish(hash4));

// Final verification
const t1 = await contract.publishedAt(hash3);
const t2 = await contract.publishedAt(hash4);
console.log(`\n=== EXTRA CONTRACT TRANSACTIONS COMPLETE ===`);
console.log(`Additional transactions broadcast: ${txResults.length}`);
for (const r of txResults) {
  console.log(`  ${r.label}: ${r.hash} (block ${r.block}, status ${r.status})`);
}
console.log(`\nAttestation 3 (Wallet 1): hash ${hash3}, timestamp ${t1.toString()}`);
console.log(`Attestation 4 (Wallet 2): hash ${hash4}, timestamp ${t2.toString()}`);
console.log(`\nTotal contract interactions: 6 (4 original + 2 extra)`);
console.log(`Explorer: https://scan.botchain.ai`);