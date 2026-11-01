import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);
let solc;
try { solc = require('solc'); }
catch { console.error('Solidity compiler is not installed. Install the pinned dev dependency with npm install, then retry.'); process.exit(1); }
const source = await readFile(resolve(root, 'contracts/AnalyticsRegistry.sol'), 'utf8');
const input = {
  language: 'Solidity',
  sources: { 'AnalyticsRegistry.sol': { content: source } },
  settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'paris', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } } },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
for (const item of output.errors ?? []) console[item.severity === 'error' ? 'error' : 'warn'](item.formattedMessage);
if ((output.errors ?? []).some((item) => item.severity === 'error')) process.exit(1);
const artifact = output.contracts['AnalyticsRegistry.sol'].AnalyticsRegistry;
const outDir = resolve(root, 'artifacts'); await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'AnalyticsRegistry.json'), JSON.stringify({ contractName: 'AnalyticsRegistry', sourceName: 'AnalyticsRegistry.sol', compilerVersion: solc.version(), abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}`, deployedBytecode: `0x${artifact.evm.deployedBytecode.object}` }, null, 2));
console.log(`Compiled with ${solc.version()} to artifacts/AnalyticsRegistry.json`);