import chalk from 'chalk';
import ora, { oraPromise } from 'ora';
import { Command, Option } from '@commander-js/extra-typings';
import * as fs from 'fs';
import * as path from 'path';
import { loadWalletKey, writeToFile } from '@lib/helpers';
import { CreateAssetRequest, CreateAssetUploadRequest, CreateCollectionRequest, CreateCollectionUploadRequest, UploadRequest } from './types/request';
import { CollectionConfig } from './types/config';
import { createAsset, createAssetUpload, createCollection, createCollectionUpload } from './lib/manageAssets';
import { UploaderOptions } from './types/storage';
import { bulkUploadFiles } from './lib/uploadFiles';
import { fileTypeFromFile } from 'file-type';

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
  .addOption(new Option('-upc, --uploadConfig <path>', 'Uploader config path'))
  .addOption(new Option('-up, --uploadPath <path>', 'File to upload path'))
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

    if (opts.uploadPath && opts.uploadConfig) {
      const uploaderOptions = JSON.parse(fs.readFileSync(opts.uploadConfig, 'utf-8')) as UploaderOptions;
      if (!uploaderOptions) {
        throw new Error('Invalid uploader config');
      }
      if (opts.collectionConfig) {
        const collectionConfig = JSON.parse(fs.readFileSync(opts.collectionConfig, 'utf-8')) as CollectionConfig;
        if (!collectionConfig) {
          throw new Error('Invalid collection config');
        }
        createCollectionArgs.royaltyEnforcementConfig = collectionConfig.royaltyEnforcementConfig;
        createCollectionArgs.name = collectionConfig.name;
        // Note: URI is ignored as we are uploading
      }
      const createCollectionUploadArgs: CreateCollectionUploadRequest = {
        ...createCollectionArgs,
        uploadRequest: {
          fileName: path.basename(opts.uploadPath),
          filePath: opts.uploadPath,
        }
      };
      const res = await oraPromise(createCollectionUpload(createCollectionUploadArgs, uploaderOptions), {
        text: 'Creating collection with upload...',
        spinner: 'dots',
        failText: (e) => error(`Failed to create collection with upload: ${e}`),
        successText: success('Collection with upload created'),
      });

      writeToFile(res, `collection-${res.address}.json`, {
        writeToFile: opts.log,
      });
    } else {
      if (!opts.externalUrl) {
        throw new Error('External URL is required when not using an uploader');
      }
      const updateArgsWithConfig = () => {
        const collectionConfig = JSON.parse(fs.readFileSync(opts.collectionConfig, 'utf-8')) as CollectionConfig;
        if (!collectionConfig) {
          throw new Error('Invalid collection config');
        }
        createCollectionArgs.royaltyEnforcementConfig = collectionConfig.royaltyEnforcementConfig;
        createCollectionArgs.name = collectionConfig.name;
        createCollectionArgs.uri = collectionConfig.uri;
      };

      const updateArgsWithCreators = () => {
        const creators = opts.creators?.split(',').map((c) => {
          const [address, percentage] = c.split(':');
          return { address, percentage: parseInt(percentage) };
        });
        createCollectionArgs.royaltyEnforcementConfig = {
          basisPoints: opts.sellerFeeBasisPoints,
          creators,
        };
      };

      if (opts.collectionConfig) {
        updateArgsWithConfig();
      } else if (opts.creators) {
        updateArgsWithCreators();
      }

      const res = await oraPromise(createCollection(createCollectionArgs), {
        text: 'Creating collection...',
        spinner: 'dots',
        failText: (e) => error(`Failed to create collection: ${e}`),
        successText: success('Collection created'),
      });

      writeToFile(res, `collection-${res.address}.json`, {
        writeToFile: opts.log,
      });
    }
  });

programCommand('createAsset', { requireWallet: true })
  .description('Create a new Asset')
  .addOption(new Option('-n, --name <string>', 'Asset name').makeOptionMandatory())
  .addOption(new Option('-ex, --externalUrl <string>', 'External JSON URL with metadata'))
  .addOption(new Option('-cc, --collection <string>', 'Collection address'))
  .addOption(new Option('-upc, --uploadConfig <path>', 'Uploader config path'))
  .addOption(new Option('-up, --uploadPath <path>', 'File to upload path'))
  .action(async (opts) => {
    const keypair = loadWalletKey(opts.keypair);
    if (opts.uploadConfig) {
      const uploaderConfig = JSON.parse(fs.readFileSync(opts.uploadConfig, 'utf-8')) as UploaderOptions;
      if (!uploaderConfig) {
        throw new Error('Invalid uploader config');
      }
      const createAssetUploadRequest: CreateAssetUploadRequest = {
        keyPair: keypair.secretKey,
        rpcUrl: opts.rpc,
        env: opts.env,
        name: opts.name,
        collectionAddress: opts.collection,
        compute: {
          price: opts.computePrice,
          units: opts.computeLimit,
        },
        uploadRequest: {
          filePath: opts.uploadPath,
          fileName: path.basename(opts.uploadPath),
        },
      };
      const res = await oraPromise(createAssetUpload(createAssetUploadRequest, uploaderConfig), {
        text: 'Creating asset with upload...',
        spinner: 'dots',
        failText: (e) => error(`Failed to create asset with upload: ${e}`),
        successText: success('Asset with upload created'),
      });
      writeToFile(res, `asset-${res.address}.json`, {
        writeToFile: opts.log,
      });
    } else {
      if (!opts.externalUrl) {
        throw new Error('External URL is required when not using an uploader');
      }
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
        failText: (e) => error(`Failed to create asset: ${e}`),
        successText: success('Asset created'),
      });
      writeToFile(res, `asset-${res.address}.json`, {
        writeToFile: opts.log,
      });
    }
    return;
  });

programCommand('bulkUpload', { requireWallet: true })
  .description('Bulk upload files')
  .addOption(new Option('-upc, --uploadConfig <path>', 'Uploader config path'))
  .addOption(new Option('-up, --uploadPaths <path>', 'Files to upload path using uploadFilesConfig'))
  .action(async (opts) => {
    const keypair = loadWalletKey(opts.keypair);
    const uploaderConfig = JSON.parse(fs.readFileSync(opts.uploadConfig, 'utf-8')) as UploaderOptions;
    if (!uploaderConfig) {
      throw new Error('Invalid uploader config');
    }
    const uploadPaths = JSON.parse(fs.readFileSync(opts.uploadPaths, 'utf-8')) as UploadRequest[];
    if (!uploadPaths) {
      throw new Error('Invalid upload paths config');
    }
    const results = await oraPromise(bulkUploadFiles(uploaderConfig, uploadPaths, keypair.secretKey, opts.rpc, opts.env), {
      text: `Uploading ${uploadPaths.length} files...`,
      spinner: 'dots',
      failText: (e) => error(`Failed to upload files: ${e}`),
      successText: success(`Files uploaded!`),
    });
    writeToFile(results, `bulk-upload-${new Date().getTime()}.json`, {
      writeToFile: opts.log,
    });
  });

programCommand('generateUploadConfig', { requireWallet: false })
  .description('Generate upload config from a folder path')
  .addOption(new Option('-fp, --folderPath <path>', 'Folder path to generate upload config'))
  .action(async (opts) => {
    const folderPath = opts.folderPath;
    if (!fs.existsSync(folderPath)) {
      throw new Error('Folder path does not exist');
    }
    ora().info(`Generating upload config from folder: ${folderPath}`);
    const files = fs.readdirSync(folderPath);
    const uploadRequests: UploadRequest[] = await Promise.all(files.map(async (file) => {
      const filePath = path.join(folderPath, file);
      const fileTypeResult = await fileTypeFromFile(filePath);
      const mimeType = fileTypeResult?.mime;
      const fileType = mimeType || 'image/png';
      return {
        filePath,
        type: fileType,
        fileName: file,
      };
    }));
    writeToFile(uploadRequests, `uploadFilesConfig-${new Date().getTime()}.json`, {
      writeToFile: opts.log,
    });
    ora().succeed(`Upload config generated with ${uploadRequests.length} files`);
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
