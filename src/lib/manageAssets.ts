import * as fs from 'fs';
import * as bs58 from 'bs58';
import { createCollectionV2, ruleSet, BasePluginAuthority, createV2, addPlugin, updateV2, fetchAsset, updateCollectionV1 } from '@metaplex-foundation/mpl-core';
import { createGenericFile, generateSigner, publicKey, Signer, Umi } from '@metaplex-foundation/umi';
import { BaseRequest, CreateAssetRequest, CreateAssetUploadRequest, CreateCollectionRequest, CreateCollectionUploadRequest, UpdateAssetRequest } from '@/types/request';
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
    let { umi, signer, umiKeypair } = createUmiWithSigner(keyPair, rpcUrl, env);
    umi = await addUploader(umi, uploader, umiKeypair);
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

    const authorityPlugin: BasePluginAuthority = {
        __kind: 'Address',
        address: request.royaltyEnforcementConfig.authority ? publicKey(request.royaltyEnforcementConfig.authority) : request.signer.publicKey
    }

    let builder = createCollectionV2(umi, {
        collection: mintSigner,
        name: request.name,
        uri: request.uri,
        payer: request.signer,
        plugins: request.royaltyEnforcementConfig ? [
            {
                plugin: {
                    __kind: 'Royalties',
                    fields: [{
                        basisPoints: request.royaltyEnforcementConfig.basisPoints,
                        creators: request.royaltyEnforcementConfig.creators.map(creator => ({
                            address: publicKey(creator.address),
                            percentage: creator.percentage
                        })),
                        ruleSet: ruleSet('None')
                    }]
                },
                authority: authorityPlugin
            }
        ] : null
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
    let builder = createV2(umi, {
        asset: assetSigner,
        collection: options.collectionAddress ? publicKey(options.collectionAddress) : undefined,
        name: options.metadata.name,
        uri: options.metadata.uri,
        payer: signer,
    });

    if (options.compute) {
        builder = addCompute(umi, builder, options.compute);
    }

    const res = await builder.sendAndConfirm(umi);

    return {
        address: assetSigner.publicKey.toString(),
        signature: bs58.encode(res.signature)
    };
}

export async function updateAsset(options: UpdateAssetRequest): Promise<BaseResponse> {
    const { mint, keyPair, rpcUrl, env, newName, newUri, collectionAddress } = options;
    const { umi, signer } = createUmiWithSigner(keyPair, rpcUrl, env);
    const asset = await fetchAsset(umi, publicKey(mint));
    if (!asset) {
        throw new Error(`asset ${mint} not found`);
    }
    let builder = updateV2(umi, {
        asset: publicKey(mint),
        collection: collectionAddress ? publicKey(collectionAddress) : undefined,
        newName: newName || asset.name,
        newUri: newUri || asset.uri,
        payer: signer,
    });

    if (options.compute) {
        builder = addCompute(umi, builder, options.compute);
    }

    const res = await builder.sendAndConfirm(umi);

    return {
        address: mint,
        signature: bs58.encode(res.signature)
    };
}

export async function updateCollection(options: UpdateAssetRequest): Promise<BaseResponse> {
    const { mint, keyPair, rpcUrl, env, newName, newUri } = options;
    const { umi, signer } = createUmiWithSigner(keyPair, rpcUrl, env);
    const asset = await fetchAsset(umi, publicKey(mint));
    if (!asset) {
        throw new Error(`asset ${mint} not found`);
    }
    let builder = updateCollectionV1(umi, {
        collection: mint ? publicKey(mint) : undefined,
        newName: newName || asset.name,
        newUri: newUri || asset.uri,
        payer: signer,
    });

    if (options.compute) {
        builder = addCompute(umi, builder, options.compute);
    }

    const res = await builder.sendAndConfirm(umi);

    return {
        address: mint,
        signature: bs58.encode(res.signature)
    };
}

export async function createAssetUpload(options: CreateAssetUploadRequest, uploader: UploaderOptions): Promise<BaseResponse> {
    const { keyPair, rpcUrl, env } = options;
    let { umi, signer, umiKeypair } = createUmiWithSigner(keyPair, rpcUrl, env);
    umi = await addUploader(umi, uploader, umiKeypair);
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

