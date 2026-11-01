import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (process.env.BOT_RPC_URL && process.env.BOT_RPC_URL !== 'https://rpc.bohr.life') throw new Error('Refusing deployment: BOT_RPC_URL must be https://rpc.bohr.life');
let privateKey = process.env.BOT_TESTNET_PRIVATE_KEY;
const localKeyFile = process.env.BOT_TESTNET_KEY_FILE ?? resolve(root, '.local-secrets/bot-testnet-deployer.json');
if (!privateKey && localKeyFile) {
  const keyFile = resolve(localKeyFile);
  if (keyFile.startsWith(resolve(homedir(), '.local-secrets'))) throw new Error('Refusing unexpected key location.');
  try {
  const keyStats = await stat(keyFile);
  if ((keyStats.mode & 0o077) !== 0 && process.platform !== 'win32') throw new Error('Key file permissions must be owner-only (chmod 600).');
  const secret = JSON.parse(await readFile(keyFile, 'utf8'));
  if (secret.chainId !== 968 || secret.network !== 'BOT Chain Testnet') throw new Error('Key file is not marked for BOT testnet chain 968.');
  privateKey = secret.privateKey;
  } catch (error) {
    if (process.env.BOT_TESTNET_KEY_FILE || error.code !== 'ENOENT') throw error;
  }
}
if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error('Provide BOT_TESTNET_PRIVATE_KEY or BOT_TESTNET_KEY_FILE for a funded testnet-only deployer. Secret is never logged.');
const require = createRequire(import.meta.url);
const { JsonRpcProvider, Wallet, ContractFactory } = require('ethers');
const artifact = JSON.parse(await readFile(resolve(root, 'artifacts/AnalyticsRegistry.json'), 'utf8'));
const provider = new JsonRpcProvider(process.env.BOT_RPC_URL ?? 'https://rpc.bohr.life', 968, { staticNetwork: true });
const network = await provider.getNetwork();
if (network.chainId !== 968n) throw new Error(`Refusing deployment: RPC chainId is ${network.chainId}, expected 968`);
const wallet = new Wallet(privateKey, provider);
const balance = await provider.getBalance(wallet.address);
if (balance === 0n) throw new Error(`Deployer ${wallet.address} has zero BOT testnet balance. Fund it before deployment.`);
console.log(`Deploying AnalyticsRegistry to BOT testnet (968) from ${wallet.address}; private key is not displayed.`);
const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
const contract = await factory.deploy({ gasLimit: 1_000_000n });
const tx = contract.deploymentTransaction();
console.log(`Broadcast transaction: ${tx.hash}`);
const receipt = await tx.wait(1);
if (!receipt || receipt.status !== 1) throw new Error(`Deployment transaction failed: ${tx.hash}`);
const address = await contract.getAddress();
const code = await provider.getCode(address);
if (code === '0x') throw new Error(`No code at deployed address ${address}`);
console.log(JSON.stringify({ chainId: 968, contract: 'AnalyticsRegistry', address, deployer: wallet.address, transactionHash: tx.hash, blockNumber: receipt.blockNumber, explorer: `https://scan.bohr.life/address/${address}` }, null, 2));
const deploymentRecord = { chainId: 968, contract: 'AnalyticsRegistry', address, deployer: wallet.address, transactionHash: tx.hash, blockNumber: receipt.blockNumber, explorer: `https://scan.bohr.life/address/${address}`, verifiedOnChainAt: new Date().toISOString() };
await (await import('node:fs/promises')).writeFile(resolve(root, 'deployments/testnet-968.json'), `${JSON.stringify(deploymentRecord, null, 2)}\n`);