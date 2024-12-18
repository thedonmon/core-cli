import { UploadRequest } from "@/types/request";
import { UploaderOptions } from "@/types/storage";
import { Cluster } from "@solana/web3.js";
import { addUploader, createUmiWithSigner } from "./helpers";
import { createGenericFile } from "@metaplex-foundation/umi";
import * as fs from 'fs';
import * as got from 'got';
import { fileTypeFromStream, fileTypeFromFile } from "file-type";

export async function bulkUploadFiles(config: UploaderOptions, files: UploadRequest[], keyPair: string | Uint8Array, rpcUrl?: string, env: string = 'devnet'): Promise<{
    uploaded: {
        fileUrl: string;
        originalUri: string;
        type: string;
    }[], failed: {
        failedUri: string;
        error: string;
    }[]
}> {
    const controller = new AbortController();

    process.on('SIGINT', () => {
        console.log('\nCancelling upload...');
        controller.abort();
    });

    let { umi, signer, umiKeypair } = createUmiWithSigner(keyPair, rpcUrl, env);
    umi = await addUploader(umi, config, umiKeypair);

    const uploaded: {
        fileUrl: string;
        originalUri: string;
        type: string;
    }[] = [];
    const failed: {
        failedUri: string;
        error: string;
    }[] = [];

    // Handle file upload, either from URL or local path
    async function handleFileUpload(file: UploadRequest) {
        let buffer: Buffer, mimeType: string, uploadedUri: string;

        if (file.fileUrl) {
            try {
                const stream = got.stream(file.fileUrl);
                const fileTypeResult = await fileTypeFromStream(stream);
                mimeType = fileTypeResult?.mime;
                const response = await fetch(file.fileUrl);
                if (!response.ok) throw new Error(`Failed to fetch file from URL ${file.fileUrl}`);
                const arrBuffer = await response.arrayBuffer();
                buffer = Buffer.from(arrBuffer);
            } catch (error) {
                console.error(`Error fetching file from URL ${file.fileUrl}:`, error);
                failed.push({
                    failedUri: file.fileUrl,
                    error: error?.message || 'Unknown error'
                });
                return;
            }
        } else if (file.filePath) {
            try {
                const fileTypeResult = await fileTypeFromFile(file.filePath);
                mimeType = fileTypeResult?.mime || (file.filePath.endsWith('.json') ? 'application/json' : 'application/octet-stream');
                buffer = fs.readFileSync(file.filePath);
            } catch (error) {
                console.error(`Error reading file from path ${file.filePath}:`, error);
                failed.push({
                    failedUri: file.filePath,
                    error: error?.message || 'Unknown error'
                });
                return;
            }
        }

        if (!buffer && !mimeType) {
            failed.push({
                failedUri: file.fileUrl || file.filePath,
                error: 'Failed to read file buffer and determine MIME type'
            });
            return;
        }

        const uint8Array = new Uint8Array(buffer);
        const genericFile = createGenericFile(
            uint8Array, 
            file.fileName,
            {
                contentType: mimeType || 'application/octet-stream',
                extension: file.fileName.split('.').pop() || '',
                tags: [
                    { name: 'Content-Type', value: mimeType || 'application/octet-stream' }
                ]
            }
        );
        try {
            const [uri] = await umi.uploader.upload([genericFile], {
                signal: controller.signal,
                onProgress: (progress) => {
                    console.log(`Upload progress: ${progress}%`);
                }
            });
            console.log(`Uploaded file to URI: ${uri}`);
            uploadedUri = uri;
            if (!uploadedUri) throw new Error('Upload failed without a specific error.');
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Upload was cancelled');
                return;
            }
            console.error(`Error uploading file:`, error);
            failed.push({
                failedUri: file.fileUrl || file.filePath,
                error: error?.message || 'Unknown error'
            });
        }
        if (uploadedUri) uploaded.push({
            fileUrl: uploadedUri,
            originalUri: file.fileUrl || file.filePath,
            type: mimeType
        });
    }

    const chunkSize = 5;
    for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize);
        await Promise.all(chunk.map(handleFileUpload));
    }

    process.removeAllListeners('SIGINT');

    return { uploaded, failed };
}