import { config } from '../src/config.mjs';
import { networkStatus, verifyContracts } from '../src/analytics.mjs';

if (config.chainId !== 968) throw new Error(`Deployment must target chain 968, configured ${config.chainId}`);
if (config.rpcUrl !== 'https://rpc.bohr.life') throw new Error('Deployment is not configured for the official BOT testnet RPC.');
if (config.apiBaseUrl !== 'https://dex-wallet.bohr.life') throw new Error('Deployment is not configured for the official testnet BDEX API.');
const network = await networkStatus();
if (!network.correctChain) throw new Error(`RPC returned chain ${network.chainId}; refusing deployment preflight.`);
const contracts = await verifyContracts();
const absent = Object.entries(contracts).filter(([, value]) => !value.hasCode);
if (absent.length) throw new Error(`No deployed code for: ${absent.map(([name]) => name).join(', ')}`);
console.log(JSON.stringify({ status: 'preflight-passed', network, contracts }, null, 2));