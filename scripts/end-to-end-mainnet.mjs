import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keccak256, toUtf8Bytes } from 'ethers';

const chainId = Number(process.env.BOT_CHAIN_ID);
if (!Number.isSafeInteger(chainId) || chainId !== 677) throw new Error('BOT_CHAIN_ID must be 677 for BOT Chain Mainnet.');
const rpcUrl = process.env.BOT_RPC_URL;
if (!rpcUrl || rpcUrl !== 'https://rpc.botchain.ai') throw new Error('Mainnet requires BOT_RPC_URL=https://rpc.botchain.ai');
if (process.env.END_TO_END_MAINNET !== '1') throw new Error('Set END_TO_END_MAINNET=1 to confirm broadcasting mainnet transactions.');

const require = createRequire(import.meta.url);
const { JsonRpcProvider, Wallet, Contract, parseEther } = require('ethers');
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

const [b1, b2, b3, bOwner] = await Promise.all([
  provider.getBalance(w1.address), provider.getBalance(w2.address), provider.getBalance(w3.address), provider.getBalance(owner.address)
]);
console.log(`Pre-flight balances (wei):`);
console.log(`  Wallet 1 (${w1.address}): ${b1.toString()}`);
console.log(`  Wallet 2 (${w2.address}): ${b2.toString()}`);
console.log(`  Wallet 3 (${w3.address}): ${b3.toString()}`);
console.log(`  Owner     (${owner.address}): ${bOwner.toString()}`);

if (b1 === 0n) throw new Error('Wallet 1 has zero balance — cannot distribute.');
if (bOwner === 0n) throw new Error('Owner wallet has zero balance — cannot authorize publishers.');

const contract = new Contract(registryAddress, registryAbi, provider);
const contractOwner = await contract.owner();
if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) throw new Error('Deployer key is not the contract owner.');
console.log(`\nContract owner verified: ${contractOwner}`);

const txResults = [];

async function sendAndWait(label, tx) {
  console.log(`\n[${txResults.length + 1}/6] ${label}`);
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

// Tx 1: Distribute BOT Wallet 1 -> Wallet 2
await sendAndWait('Transfer BOT Wallet 1 → Wallet 2', w1.sendTransaction({
  to: w2.address,
  value: parseEther('0.01'),
  gasLimit: 21000
}));

// Tx 2: Distribute BOT Wallet 1 -> Wallet 3
await sendAndWait('Transfer BOT Wallet 1 → Wallet 3', w1.sendTransaction({
  to: w3.address,
  value: parseEther('0.01'),
  gasLimit: 21000
}));

// Re-check balances after distribution
const [b1After, b2After, b3After] = await Promise.all([
  provider.getBalance(w1.address), provider.getBalance(w2.address), provider.getBalance(w3.address)
]);
console.log(`\nPost-distribution balances (wei):`);
console.log(`  Wallet 1: ${b1After.toString()}`);
console.log(`  Wallet 2: ${b2After.toString()}`);
console.log(`  Wallet 3: ${b3After.toString()}`);

// Tx 3: Owner -> setPublisher(Wallet1, true)
const contractWithOwner = contract.connect(owner);
await sendAndWait('Contract: Owner setPublisher(Wallet1, true)', contractWithOwner.setPublisher(w1.address, true));

// Tx 4: Owner -> setPublisher(Wallet2, true)
await sendAndWait('Contract: Owner setPublisher(Wallet2, true)', contractWithOwner.setPublisher(w2.address, true));

// Verify publishers
const p1 = await contract.publishers(w1.address);
const p2 = await contract.publishers(w2.address);
console.log(`\nPublisher status: Wallet 1=${p1}, Wallet 2=${p2}`);

// Tx 5: Wallet 1 -> publish(contentHash1)
const hash1 = keccak256(toUtf8Bytes('bdex-mainnet-wallet-1-attestation-' + Date.now()));
const contractWithW1 = contract.connect(w1);
await sendAndWait('Contract: Wallet 1 publish(bytes32)', contractWithW1.publish(hash1));

// Tx 6: Wallet 2 -> publish(contentHash2)
const hash2 = keccak256(toUtf8Bytes('bdex-mainnet-wallet-2-attestation-' + Date.now()));
const contractWithW2 = contract.connect(w2);
await sendAndWait('Contract: Wallet 2 publish(bytes32)', contractWithW2.publish(hash2));

// Final verification
const t1 = await contract.publishedAt(hash1);
const t2 = await contract.publishedAt(hash2);
console.log(`\n=== END-TO-END MAINNET TEST COMPLETE ===`);
console.log(`Total transactions broadcast: ${txResults.length}`);
for (const r of txResults) {
  console.log(`  ${r.label}: ${r.hash} (block ${r.block}, status ${r.status})`);
}
console.log(`\nAttestation 1 (Wallet 1): hash ${hash1}, timestamp ${t1.toString()}`);
console.log(`Attestation 2 (Wallet 2): hash ${hash2}, timestamp ${t2.toString()}`);
console.log(`\nAll ${txResults.length} transactions confirmed on BOT Chain Mainnet (chain 677).`);
console.log(`Explorer: https://scan.botchain.ai`);