const appEnv = process.env.APP_ENV ?? 'testnet-deployment';
const isMainnet = appEnv === 'mainnet';
const rpcUrl = process.env.BOT_RPC_URL ?? 'https://rpc.bohr.life';
const apiBaseUrl = process.env.BDEX_API_BASE_URL ?? 'https://dex-wallet.bohr.life';
const explorerUrl = process.env.BOT_EXPLORER_URL ?? 'https://scan.bohr.life';
const chainId = Number(process.env.BOT_CHAIN_ID ?? 968);
const testnet = {
  v2Factory: '0x65b8e98ceA190d8c28B3e4716402027f634d15a3', v3Factory: '0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419',
  npm: '0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090', v2Locker: '0x17b6BBD34266Ed4d6770D9Ed643Fc24eE1a1197B',
  v3Locker: '0x0930Ae6F6dC8430b6662A40D41Ab54cBf041316B', wbot: '0xD5452816194a3784dBa983426cCe7c122F4abd30', usdt: '0x75edC9335175Fc0552D51D48439F229c10420fe3',
};
const addressEnv = ['v2Factory', 'v3Factory', 'npm', 'v2Locker', 'v3Locker', 'wbot', 'usdt'];
const contracts = Object.fromEntries(addressEnv.map((name) => [name, process.env[`BOT_${name.replace(/[A-Z]/g, (x) => `_${x}`).toUpperCase()}`] ?? testnet[name]]));
if (appEnv === 'testnet-deployment' && (rpcUrl !== 'https://rpc.bohr.life' || apiBaseUrl !== 'https://dex-wallet.bohr.life')) throw new Error('Testnet deployment guard: use the official BOT testnet endpoints');
if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error('BOT_CHAIN_ID must be a positive integer');
if (isMainnet) {
  for (const name of [...addressEnv, 'RPC_URL', 'API_BASE_URL', 'EXPLORER_URL']) if (!process.env[name === 'RPC_URL' ? 'BOT_RPC_URL' : name === 'API_BASE_URL' ? 'BDEX_API_BASE_URL' : name === 'EXPLORER_URL' ? 'BOT_EXPLORER_URL' : `BOT_${name.replace(/[A-Z]/g, (x) => `_${x}`).toUpperCase()}`]) throw new Error(`Mainnet configuration requires ${name}`);
  if (chainId === 968) throw new Error('Mainnet configuration must not use testnet chain ID 968');
}
for (const [name, address] of Object.entries(contracts)) if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error(`Invalid contract address for ${name}`);

export const config = {
  appEnv,
  chainId,
  chainName: isMainnet ? 'BOT Chain Mainnet' : 'BOT Chain Testnet',
  rpcUrl,
  explorerUrl,
  apiBaseUrl,
  contracts,
};