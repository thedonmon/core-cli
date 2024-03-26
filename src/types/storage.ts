import { S3Client } from '@aws-sdk/client-s3';

/**
 * Options for the Irys uploader.
 */
interface IrysUploaderOptions {
    /** (Optional) Address of the irys uploader */
    address?: string;

    /** (Optional) Timeout for the irys uploader */
    timeout?: number;

    /** (Optional) Provider URL for the irys uploader */
    providerUrl?: string;

    /** (Optional) Price multiplier for the irys uploader */
    priceMultiplier?: number;

    /** (Optional) Payer for the irys uploader. Should be path to keypair if its separate from payer */
    payer?: string;
}

/**
 * AWS uploader client configuration options.
 */
interface AwsClientConfig {
    /** Region for the aws uploader */
    region: string;

    /** Credentials for the aws uploader */
    credentials: {
        /** Access key ID for the aws uploader */
        accessKeyId: string;

        /** Secret access key for the aws uploader */
        secretAccessKey: string;
    };
}

/**
 * Options for the AWS uploader.
 */
interface AwsUploaderOptions {
    /** Client configuration for the aws uploader */
    clientConfig: AwsClientConfig;

    /** Bucket name for the aws uploader */
    bucketName: string;
}

/**
 * Options for the NFT storage uploader.
 */
interface NftStorageUploaderOptions {
    /** (Required) Token for the nft storage uploader */
    token: string;

    /** (Optional) Endpoint for the nft storage uploader */
    endpoint?: string;

    /** (Optional) Gateway host for the nft storage uploader */
    gatewayHost?: string;

    /** (Optional) Batch size for the nft storage uploader */
    batchSize?: number;

    /** (Optional) Use gateway URLs for the nft storage uploader */
    useGatewayUrls?: boolean;

    /** (Optional) Payer for the nft storage uploader. Should be path to keypair if its separate from payer. */
    payer?: string;
}

/**
 * Union type of all uploader options. Only one needs to be provided.
 */
export type UploaderOptions = {
    irysUploaderOptions?: IrysUploaderOptions;
    awsUploaderOptions?: AwsUploaderOptions;
    nftStorageUploaderOptions?: NftStorageUploaderOptions;
};


export function createS3Client(options: UploaderOptions['awsUploaderOptions']['clientConfig']): S3Client {
    return new S3Client(options);
}
