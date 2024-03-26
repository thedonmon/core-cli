import { mplCore, createV1, createPlugin, createCollectionV1, ruleSet, pluginAuthority, addressPluginAuthority } from '@metaplex-foundation/mpl-core'
import { createSignerFromKeypair, generateSigner, publicKey } from '@metaplex-foundation/umi'
import { CreateAssetRequest, CreateCollectionRequest } from '@/types/request'
import { BaseResponse } from '@/types/response'
import { addCompute, createUmiWithSigner } from '@/lib/helpers'
import bs58 = require('bs58');


export async function createCollection(options: CreateCollectionRequest): Promise<BaseResponse> {
    const { keyPair, rpcUrl, env } = options;
    const { umi, signer } = createUmiWithSigner(keyPair, rpcUrl, env);
    const mintSigner = generateSigner(umi);
    let builder = createCollectionV1(umi, {
        collection: mintSigner,
        name: options.name,
        uri: options.uri,
        payer: signer,
        plugins: options.royaltyEnforcementConfig ? [
            {
                plugin: createPlugin({
                    type: 'Royalties',
                    data: {
                        basisPoints: options.royaltyEnforcementConfig.basisPoints,
                        creators: options.royaltyEnforcementConfig.creators.map(creator => ({
                            address: publicKey(creator.address),
                            percentage: creator.percentage
                        })),
                        ruleSet: ruleSet('None')
                    }
                }),
                authority: addressPluginAuthority(options.royaltyEnforcementConfig.authority ? publicKey(options.royaltyEnforcementConfig.authority) : signer.publicKey)
            }
        ] : undefined
    });
    if (options.compute) {
        builder = addCompute(umi, builder, options.compute);
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

