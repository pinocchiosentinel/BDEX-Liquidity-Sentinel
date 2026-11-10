import { config } from '../src/config.mjs';
import { networkStatus, verifyContracts, factoryStats } from '../src/analytics.mjs';

if (config.appEnv !== 'mainnet') throw new Error('Set APP_ENV=mainnet before running the mainnet preflight.');
const network = await networkStatus();
if (!network.correctChain) throw new Error(`RPC returned chain ${network.chainId}; expected ${config.chainId}.`);
const contracts = await verifyContracts();
const absent = Object.entries(contracts).filter(([, value]) => !value.hasCode);
if (absent.length) throw new Error(`No deployed bytecode for: ${absent.map(([name]) => name).join(', ')}`);
console.log(JSON.stringify({ status: 'mainnet-preflight-passed', network, contracts, factories: await factoryStats() }, null, 2));