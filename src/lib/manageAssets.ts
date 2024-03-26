import * as fs from 'fs';
import * as bs58 from 'bs58';
import { createV1, createPlugin, createCollectionV1, ruleSet, pluginAuthority, addressPluginAuthority } from '@metaplex-foundation/mpl-core';
import { createGenericFile, generateSigner, publicKey, Signer, Umi } from '@metaplex-foundation/umi';
import { BaseRequest, CreateAssetRequest, CreateAssetUploadRequest, CreateCollectionRequest, CreateCollectionUploadRequest } from '@/types/request';
import { BaseResponse } from '@/types/response';
import { addCompute, addUploader, createUmiWithSigner } from '@/lib/helpers';
import { UploaderOptions } from '@/types/storage';
import { RoyaltyEnforcementConfig } from '@/types/config';


export async function createCollection(options: CreateCollectionRequest): Promise<BaseResponse> {
    const { keyPair, rpcUrl, env } = options;
    const { umi, signer } = createUmiWithSigner(keyPair, rpcUrl, env);
    return await createCollectionCommon({
        umi,
        name: options.name,
        uri: options.uri,
        signer,
        royaltyEnforcementConfig: options.royaltyEnforcementConfig,
        baseOptions: {
            compute: options.compute
        }
    });
}

export async function createCollectionUpload(options: CreateCollectionUploadRequest, uploader: UploaderOptions): Promise<BaseResponse> {
    const { keyPair, rpcUrl, env } = options;
    let { umi, signer } = createUmiWithSigner(keyPair, rpcUrl, env);
    umi = addUploader(umi, uploader);
    let uploadedUri: string;
    if (options.uploadRequest.filePath && !options.uploadRequest.buffer) {
        options.uploadRequest.buffer = fs.readFileSync(options.uploadRequest.filePath);
        const uint8Array = new Uint8Array(options.uploadRequest.buffer);
        const genericFile = createGenericFile(uint8Array, options.uploadRequest.fileName);
        const [uri] = await umi.uploader.upload([genericFile]);
        uploadedUri = uri;
     }
    else if (options.uploadRequest.buffer) {
        const uint8Array = new Uint8Array(options.uploadRequest.buffer);
        const genericFile = createGenericFile(uint8Array, options.uploadRequest.fileName);
        const [uri] = await umi.uploader.upload([genericFile]);
        uploadedUri = uri;
    }
    if (!uploadedUri) {
        throw new Error('No URI returned from uploader');
    }
    console.log('Uploaded URI:', uploadedUri);
    return await createCollectionCommon({
        umi,
        name: options.name,
        uri: uploadedUri,
        signer,
        royaltyEnforcementConfig: options.royaltyEnforcementConfig,
        baseOptions: {
            compute: options.compute
        }
    });
}

async function createCollectionCommon(request: {
    umi: Umi,
    name: string,
    uri: string, 
    signer: Signer,
    royaltyEnforcementConfig?: RoyaltyEnforcementConfig,
    baseOptions: BaseRequest
}): Promise<BaseResponse> {
    const umi = request.umi;
    const mintSigner = generateSigner(umi);
    let builder = createCollectionV1(umi, {
        collection: mintSigner,
        name: request.name,
        uri: request.uri,
        payer: request.signer,
        plugins: request.royaltyEnforcementConfig ? [
            {
                plugin: createPlugin({
                    type: 'Royalties',
                    data: {
                        basisPoints: request.royaltyEnforcementConfig.basisPoints,
                        creators: request.royaltyEnforcementConfig.creators.map(creator => ({
                            address: publicKey(creator.address),
                            percentage: creator.percentage
                        })),
                        ruleSet: ruleSet('None')
                    }
                }),
                authority: addressPluginAuthority(request.royaltyEnforcementConfig.authority ? publicKey(request.royaltyEnforcementConfig.authority) : request.signer.publicKey)
            }
        ] : undefined
    });
    if (request.baseOptions.compute) {
        builder = addCompute(umi, builder, request.baseOptions.compute);
    }

    const res = await builder.sendAndConfirm(umi);

    return {
        address: mintSigner.publicKey.toString(),
        signature: bs58.encode(res.signature)
    };
}

export async function createAsset(options: CreateAssetRequest): Promise<BaseResponse> {
    const { keyPair, rpcUrl, env } = options;
    const { umi, signer } = createUmiWithSigner(keyPair, rpcUrl, env);
    const assetSigner = generateSigner(umi);
    let builder = createV1(umi, {
        asset: assetSigner,
        collection: options.collectionAddress ? publicKey(options.collectionAddress) : undefined,
        name: options.metadata.name,
        uri: options.metadata.uri,
        payer: signer
    })

    if (options.compute) {
        builder = addCompute(umi, builder, options.compute);
    }

    const res = await builder.sendAndConfirm(umi);

    return {
        address: assetSigner.publicKey.toString(),
        signature: bs58.encode(res.signature)
    };
}

export async function createAssetUpload(options: CreateAssetUploadRequest, uploader: UploaderOptions): Promise<BaseResponse> {
    const { keyPair, rpcUrl, env } = options;
    let { umi, signer } = createUmiWithSigner(keyPair, rpcUrl, env);
    umi = addUploader(umi, uploader);
    let uploadedUri: string;
    if (options.uploadRequest.filePath && !options.uploadRequest.buffer) {
        options.uploadRequest.buffer = fs.readFileSync(options.uploadRequest.filePath);
        const uint8Array = new Uint8Array(options.uploadRequest.buffer);
        const genericFile = createGenericFile(uint8Array, options.uploadRequest.fileName);
        const [uri] = await umi.uploader.upload([genericFile]);
        uploadedUri = uri;
     }
    else if (options.uploadRequest.buffer) {
        const uint8Array = new Uint8Array(options.uploadRequest.buffer);
        const genericFile = createGenericFile(uint8Array, options.uploadRequest.fileName);
        const [uri] = await umi.uploader.upload([genericFile]);
        uploadedUri = uri;
    }
    if (!uploadedUri) {
        throw new Error('No URI returned from uploader');
    }
    console.log('Uploaded URI:', uploadedUri);
    return await createAsset({
        keyPair,
        rpcUrl,
        env,
        collectionAddress: options.collectionAddress,
        metadata: {
            name: options.name,
            uri: uploadedUri
        },
        compute: options.compute
    });
}

