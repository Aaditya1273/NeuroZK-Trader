#!/usr/bin/env node
// Compute Poseidon commitment Poseidon([salt, k1, k2]) as decimal
// Usage: node zk/utils/commit.js --salt 1 --k1 123 --k2 456

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { buildPoseidon } = require('circomlibjs');

(async () => {
  const argv = yargs(hideBin(process.argv)).option('salt', { type: 'string', demandOption: true })
    .option('k1', { type: 'string', demandOption: true })
    .option('k2', { type: 'string', demandOption: true })
    .parse();

  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const inputs = [argv.salt, argv.k1, argv.k2].map(BigInt);
  const hash = poseidon(inputs);
  const out = F.toString(hash);
  console.log(out);
})();
