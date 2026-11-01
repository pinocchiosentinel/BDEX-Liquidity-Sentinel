import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ganache from 'ganache';
import { BrowserProvider, ContractFactory } from 'ethers';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifact = JSON.parse(await readFile(resolve(root, 'artifacts/AnalyticsRegistry.json'), 'utf8'));
const eip1193 = ganache.provider({ logging: { quiet: true }, chain: { chainId: 1337 }, wallet: { totalAccounts: 3 } });
try {
  const provider = new BrowserProvider(eip1193);
  const owner = await provider.getSigner(0); const publisher = await provider.getSigner(1); const stranger = await provider.getSigner(2);
  const publisherAddress = await publisher.getAddress();
  const registry = await new ContractFactory(artifact.abi, artifact.bytecode, owner).deploy(); await registry.waitForDeployment();
  const hash = `0x${'42'.repeat(32)}`;
  await (await registry.publish(hash)).wait();
  assert.ok((await registry.publishedAt(hash)) > 0n, 'publisher hash should be timestamped');
  await assert.rejects(() => registry.connect(stranger).publish(`0x${'43'.repeat(32)}`));
  await (await registry.setPublisher(publisherAddress, true)).wait();
  await (await registry.connect(publisher).publish(`0x${'43'.repeat(32)}`)).wait();
  await assert.rejects(() => registry.connect(publisher).publish(hash));
  await assert.rejects(() => registry.connect(stranger).setPublisher(publisherAddress, false));
  console.log('AnalyticsRegistry tests passed: publish, timestamp, allowlist, duplicate prevention, owner access.');
} finally { await eip1193.disconnect(); }