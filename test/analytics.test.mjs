import test from 'node:test';
import assert from 'node:assert/strict';
import { addressFromWord, abiWord, addressWord, asBigInt } from '../src/providers/rpc.mjs';
import { config } from '../src/config.mjs';

test('testnet config targets chain 968 and expected RPC', () => {
  assert.equal(config.chainId, 968);
  assert.equal(config.rpcUrl, 'https://rpc.bohr.life');
  assert.match(config.contracts.v2Factory, /^0x[0-9a-fA-F]{40}$/);
});

test('ABI word helpers preserve integer/address widths', () => {
  assert.equal(abiWord(968).length, 64);
  const address = '0x65b8e98ceA190d8c28B3e4716402027f634d15a3';
  assert.equal(addressFromWord(`0x${addressWord(address)}`), address.toLowerCase());
  assert.equal(asBigInt('0x3c8'), 968n);
});

test('address validation assumptions reject malformed strings', () => {
  assert.equal(/^0x[a-fA-F0-9]{40}$/.test(config.contracts.v2Factory), true);
  assert.equal(/^0x[a-fA-F0-9]{40}$/.test('0x1234'), false);
});