import { AddPluginArgs, RemovePluginArgs, UpdatePluginArgs } from "@metaplex-foundation/mpl-core";
import { RoyaltyEnforcementConfig } from "./config";
import { BaseCompute } from "./models";

export type BaseRequest = {
    rpcUrl?: string;
    env?: string;
    compute?: BaseCompute;
}

export type BaseKeyRequest = {
    keyPair: string | Uint8Array;
} & BaseRequest;

export type BaseMetadata = {
    name: string;
    uri: string;
}

export type CreateCollectionRequest = {
    name: string;
    uri: string;
    royaltyEnforcementConfig?: RoyaltyEnforcementConfig;
} & BaseKeyRequest;

export type CreateCollectionUploadRequest = {
    uploadRequest: UploadRequest;
} & Omit<CreateCollectionRequest, 'uri'>;

export type UploadRequest = {
    filePath?: string;
    fileUrl?: string;
    type?: string;
    buffer?: Buffer;
    fileName?: string;
}

export type CreateAssetRequest = {
    collectionAddress?: string;
    metadata: BaseMetadata;
} & BaseKeyRequest;

export type CreateAssetUploadRequest = {
    name: string;
    uploadRequest: UploadRequest;
    additionalUploads?: UploadRequest[];
} & Omit<CreateAssetRequest, 'metadata'>;

export type UpdateAssetRequest = {
    mint: string,
    collectionAddress?: string,
    newName?: string,
    newUri?: string, 
    newCollection?: string,
    newCollectionSigner?: string | Uint8Array,
    newAuthority?: string,
    plugins?: {
        method: 'update' | 'add' | 'remove',
        plugin: UpdatePluginArgs | AddPluginArgs | RemovePluginArgs
    }[]
} & BaseKeyRequest