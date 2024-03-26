import chalk from 'chalk';
import ora, { oraPromise } from 'ora';
import { Command, Option } from '@commander-js/extra-typings';
import * as fs from 'fs';
import * as path from 'path';
import {
  Cluster,
  Connection,
  PublicKey,
  VersionedTransaction,
  clusterApiUrl,
} from '@solana/web3.js';
import { confirm } from '@inquirer/prompts';
import { loadWalletKey, writeToFile } from '@lib/helpers';
import { CreateAssetRequest, CreateCollectionRequest } from './types/request';
import { CollectionConfig } from './types/config';
import { createAsset, createCollection } from './lib/manageAssets';

const error = chalk.bold.red;
const success = chalk.bold.greenBright;
const warning = chalk.hex('#FFA500');
const magentaB = chalk.magentaBright;
const cliProgram = new Command();

cliProgram
  .name('nft-core-cli')
  .description('CLI for Core Assets Minting and Management')
  .version('0.0.1');

programCommand('createCollection', { requireWallet: true })
  .description('Create a new Collection')
  .addOption(new Option('-n, --name <string>', 'Collection name').makeOptionMandatory())
  .addOption(
    new Option('-f, --sellerFeeBasisPoints <number>', 'Seller fee basis points')
      .argParser((val) => parseInt(val)),
  )
  .addOption(new Option('-ex, --externalUrl <string>', 'External JSON URL with metadata'))
  .addOption(new Option('-cts, --creators <string>', 'Creators <address>:<percentage> comma separated'))
  .addOption(new Option('-cf, --collectionConfig <path>', 'Collection config path'))
  .action(async (opts) => {
    const keypair = loadWalletKey(opts.keypair);
    let createCollectionArgs: CreateCollectionRequest = {
      name: opts.name,
      uri: opts.externalUrl,
      keyPair: keypair.secretKey,
      rpcUrl: opts.rpc,
      env: opts.env,
      compute: {
        price: opts.computePrice,
        units: opts.computeLimit,
      }
    };

    if (opts.collectionConfig) {
      const collectionConfig = JSON.parse(fs.readFileSync(opts.collectionConfig, 'utf-8')) as CollectionConfig;
      createCollectionArgs.royaltyEnforcementConfig = collectionConfig.royaltyEnforcementConfig;
      createCollectionArgs.name = collectionConfig.name;
      createCollectionArgs.uri = collectionConfig.uri;
      const res = await oraPromise(createCollection(createCollectionArgs), {
        text: 'Creating collection...',
        spinner: 'dots',
        failText: error('Failed to create collection'),
        successText: success('Collection created'),
      }
      );
      writeToFile(res, `collection-${res.address}.json`, {
        writeToFile: opts.log,
      });
      return;
    }
    else {
      if (opts.creators) {
        const creators = opts.creators?.split(',').map((c) => {
          const [address, percentage] = c.split(':');
          return { address, percentage: parseInt(percentage) };
        });
        createCollectionArgs.royaltyEnforcementConfig = {
          basisPoints: opts.sellerFeeBasisPoints,
          creators,
        };
      }
      const res = await oraPromise(createCollection(createCollectionArgs), {
        text: 'Creating collection...',
        spinner: 'dots',
        failText: error('Failed to create collection'),
        successText: success('Collection created'),
      });
      writeToFile(res, `collection-${res.address}.json`, {
        writeToFile: opts.log,
      });
      return;
    }
  });

  programCommand('createAsset', { requireWallet: true })
  .description('Create a new Asset')
  .addOption(new Option('-n, --name <string>', 'Asset name').makeOptionMandatory())
  .addOption(new Option('-ex, --externalUrl <string>', 'External JSON URL with metadata'))
  .addOption(new Option('-cc, --collection <string>', 'Collection address'))
  .action(async (opts) => {
    const keypair = loadWalletKey(opts.keypair);
      const createAssetRequest: CreateAssetRequest = {
        keyPair: keypair.secretKey,
        rpcUrl: opts.rpc,
        env: opts.env,
        metadata: {
          name: opts.name,
          uri: opts.externalUrl,
        },
        collectionAddress: opts.collection,
        compute: {
          price: opts.computePrice,
          units: opts.computeLimit,
        },
      };
      const res = await oraPromise(createAsset(createAssetRequest), {
        text: 'Creating asset...',
        spinner: 'dots',
        failText: error('Failed to create asset'),
        successText: success('Asset created'),
      });
      writeToFile(res, `asset-${res.address}.json`, {
        writeToFile: opts.log,
      });
      return;
  });


function programCommand(
  name: string,
  options: { requireWallet: boolean } = { requireWallet: true },
) {
  const cmProgram = cliProgram
    .command(name)
    .option(
      '-e, --env <string>',
      'Solana cluster env name',
      'devnet', //mainnet-beta, testnet, devnet
    )
    .addOption(
      new Option(
        '-k, --keypair <path>',
        `Solana wallet location`,
      ).makeOptionMandatory(options.requireWallet),
    )
    .addOption(
      new Option('-cp, --computePrice <number>', 'Compute unit price')
        .argParser((val) => parseInt(val))
        .default(0),
    )
    .addOption(
      new Option('-cl, --computeLimit <number>', 'Compute unit limit')
        .argParser((val) => parseInt(val))
        .default(0),
    )
    .addOption(new Option('-r, --rpc <string>', `RPC URL`))
    .option('--no-log', 'Do not log the result to a file');
  return cmProgram;
}

cliProgram.parse(process.argv);
