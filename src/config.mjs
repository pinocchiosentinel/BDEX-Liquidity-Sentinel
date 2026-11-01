const rpcUrl = process.env.BOT_RPC_URL ?? 'https://rpc.bohr.life';
const apiBaseUrl = process.env.BDEX_API_BASE_URL ?? 'https://dex-wallet.bohr.life';
const appEnv = process.env.APP_ENV ?? 'testnet-deployment';
if (appEnv === 'testnet-deployment' && rpcUrl !== 'https://rpc.bohr.life') throw new Error('Testnet deployment guard: BOT_RPC_URL must remain https://rpc.bohr.life');
if (appEnv === 'testnet-deployment' && apiBaseUrl !== 'https://dex-wallet.bohr.life') throw new Error('Testnet deployment guard: BDEX_API_BASE_URL must remain https://dex-wallet.bohr.life');

export const config = {
  chainId: 968,
  chainName: 'BOT Chain Testnet',
  rpcUrl,
  explorerUrl: 'https://scan.bohr.life',
  apiBaseUrl,
  contracts: {
    v2Factory: '0x65b8e98ceA190d8c28B3e4716402027f634d15a3',
    v3Factory: '0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419',
    npm: '0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090',
    v2Locker: '0x17b6BBD34266Ed4d6770D9Ed643Fc24eE1a1197B',
    v3Locker: '0x0930Ae6F6dC8430b6662A40D41Ab54cBf041316B',
    wbot: '0xD5452816194a3784dBa983426cCe7c122F4abd30',
    usdt: '0x75edC9335175Fc0552D51D48439F229c10420fe3',
  },
};