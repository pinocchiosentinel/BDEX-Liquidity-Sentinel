import { config } from '../src/config.mjs';
import { apiPoolDirectory, factoryStats, networkStatus, verifyContracts } from '../src/analytics.mjs';

const network = await networkStatus();
if (!network.correctChain) throw new Error(`Expected testnet chain ${config.chainId}, got ${network.chainId}`);
const [factories, contracts, directory] = await Promise.all([factoryStats(), verifyContracts(), apiPoolDirectory('all')]);
if (!Array.isArray(directory.pairs?.data)) throw new Error('Testnet pairs API did not return a data array');
console.log(JSON.stringify({ validatedAt: new Date().toISOString(), network, factories, contracts, apiPairCount: directory.pairs.data.length, apiPoolCount: directory.pools?.data?.length ?? null, samplePair: directory.pairs.data[0] ?? null }, null, 2));