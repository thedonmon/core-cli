#### Core Asset Cli *⚠️EXPERIMENTAL⚠️*

## Intro

Experimental CLI tool that is a work in progress to interact with the new Metaplex Core standard for NFTs. This standard may be changing/adding features so use at your own risk. 

## Sources

- [Umi](https://github.com/metaplex-foundation/umi/tree/main)
- [Metaplex Docs](https://developers.metaplex.com/core)

## Install

1. Install [node.js](https://nodejs.org/en/download/), [yarn](https://yarnpkg.com/getting-started/install) (or use npm).
2. Clone this repository, and using a terminal navigate to its directory.
3. Run `yarn` or `npm install` to install the dependencies.

## Build & Run

1. Copy the contents of the `.env.example` file to a `.env` next to it, and edit it with your values.
2. Run `yarn cli <cmdname> -args`

#### Usage

To interact with the CNFT CLI, you can use the following commands. Make sure you have set up your environment correctly as per the installation instructions.

### Commands

1. **Create Collection**

   Create a new core collection.

   ```bash
   yarn cli createCollection -n <name> [-ex <externalUrl>] [-cf <collectionConfig>] [-upc <uploadConfig>] [-up <uploadPath>]
   ```

    - `-n, --name <string>`: Collection name. (Mandatory)
    - `-ex, --externalUrl <string>`: External JSON URL with metadata for the collection. Required if not using an uploader. If using an uploader, this will be ignored in favor of the file specified in `-up`.
    - `-cf, --collectionConfig <path>`: Path to the collection configuration file. This file can specify additional collection properties, including `royaltyEnforcementConfig`.
    - `-upc, --uploadConfig <path>`: Path to the uploader configuration file. This is required if you are using the `-up` option to upload collection image or metadata.
    - `-up, --uploadPath <path>`: Path to the file to be uploaded as part of the collection creation. This triggers the asset creation with file upload logic.

1. **Create Asset**

   Create a new core asset.

   ```bash
   yarn cli createAsset -n <name> -ex <externalUrl> -cc <collection> [-up <uploadPath>]
   ```
    - `-n, --name <string>`: Asset name. (Mandatory)
    - `-ex, --externalUrl <string>`: External JSON URL with metadata. This is required if not using an uploader. 
    - `-cc, --collection <string>`: Collection address to which the asset will be added. (Mandatory)
    - `-up, --uploadPath <path>`: Path to the uploader configuration file. Providing this option triggers the asset creation with file upload logic.

#### Behavior When Providing Uploader Config

When the `-up` (uploadPath) option is provided along with the uploader configuration file, the CLI will attempt to upload the file specified in the `-ex` (externalUrl) option as part of the asset creation process. The uploader configuration should specify the details of the storage solution (e.g., AWS, NFT.Storage) to be used for uploading. The asset's metadata will then include the URL to the uploaded file.

#### Behavior Without Uploader Config

If the `-up` option is not provided, the CLI expects the `-ex` option to contain a direct URL to the asset's metadata. In this case, no file upload will occur, and the provided URL will be used directly in the asset's metadata.

### Additional Options

Most commands support the following additional options:

- `-e, --env <string>`: Solana cluster env name (default: devnet).
- `-k, --keypair <path>`: Solana wallet location. This option is mandatory for commands that require a wallet.
- `-r, --rpc <string>`: Custom RPC URL.
- `-cp, --computePrice <number>`: Compute unit price. If not provided, no compute price instruction will be added.
- `-cl, --computeLimit <number>`: Compute unit limit. If not provided, no compute limit instruction will be added.
- `--no-log`: Do not log results to outfile (default: true).

