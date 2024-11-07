import { 
    createGenericFileFromJson,
    GenericFile,
    lamports,
    Amount,
    UploaderInterface,
    UploaderUploadOptions,
    UploaderGetUploadPriceOptions,
  } from '@metaplex-foundation/umi';
  import { ShdwDrive } from '@shadow-drive/sdk';
  import { PublicKey } from '@solana/web3.js';
import { ShdwUploadOptions } from './shdwOptions';
  
  /**
   * Creates a SHDW Drive uploader that implements the UMI UploaderInterface
   * @param {ShdwDrive} drive - The initialized SHDW Drive instance
   * @param {ShdwUploadOptions} options - Configuration options for SHDW uploads
   * @returns {UploaderInterface} An uploader interface for SHDW Drive
   * @throws {Error} If storage account options are not properly configured or upload throws errors
   */
  export function createShdwUploader(
    drive: ShdwDrive,
    options: ShdwUploadOptions,
  ): UploaderInterface {
    if (!options.storageAccount && !options.createStorageAccountIfNotExist) {
        throw new Error("Must either pass a storage account or set createStorageAccountIfNotExist to true");
    }
    if (options.createStorageAccountIfNotExist && !options.defaultStorageSize) {
        throw new Error("If creating a storage account must specify a default size in MB");
    }
    let storageAccountKey = options.storageAccount;
    const overwriteExistingFiles = options.overwriteExistingFiles;
    const concurrentUploads = options.concurrentUploads;

    /**
     * Ensures a storage account exists or creates one if needed
     * @returns {Promise<string>} The storage account public key
     * @throws {Error} If storage account creation fails or existing account not found
     */
    const ensureStorageAccount = async (): Promise<string> => {
      if (storageAccountKey) {
        try {
          await drive.getStorageAccount(new PublicKey(storageAccountKey));
          return storageAccountKey;
        } catch (error) {
          if (!options.createStorageAccountIfNotExist) {
            throw new Error(`Storage account ${storageAccountKey} not found and creation not enabled`);
          }
        }
      }

      if (!options.defaultStorageSize) {
        throw new Error("Storage size must be specified for account creation");
      }

      try {
        const accountName = `shdw-storage-${Date.now()}`;
        const size = `${options.defaultStorageSize}MB`;
        const result = await drive.createStorageAccount(
          accountName,
          size
        );
        storageAccountKey = result.shdw_bucket;
        return storageAccountKey;
      } catch (error) {
        throw new Error(`Failed to create storage account: ${error}`);
      }
    };

    /**
     * Uploads a single file to SHDW Drive
     * @param {GenericFile} file - The file to upload
     * @param {UploaderUploadOptions} [options] - Upload options including progress callback
     * @returns {Promise<string>} The URI of the uploaded file
     * @throws {Error} If upload fails or is aborted
     */
    const uploadOne = async (
      file: GenericFile, 
      options?: UploaderUploadOptions
    ): Promise<string> => {
      try {
        if (options?.signal?.aborted) {
          throw new Error('Upload aborted');
        }

        const account = await ensureStorageAccount();
  
        const shadowFile = {
          name: file.uniqueName,
          file: Buffer.from(file.buffer),
        };
  
        const result = await drive.uploadFile(
          new PublicKey(account),
          shadowFile,
          overwriteExistingFiles,
        );
        options?.onProgress?.(100);
        if (result.upload_errors.length > 0) {
          console.error('Upload errors occurred:');
          result.upload_errors.forEach((error, index) => {
            console.error(`Error ${index + 1}: ${error.file} - Status: ${error.error || 'Unknown error'} - Storage Account: ${error.storage_account}`);
          });
        }
        return result.finalized_locations[0];
      } catch (error) {
        throw new Error(`Failed to upload to Shadow Drive: ${error}`);
      }
    };
  
    /**
     * Uploads multiple files to SHDW Drive
     * @param {GenericFile[]} files - Array of files to upload
     * @param {UploaderUploadOptions} [options] - Upload options including progress callback
     * @returns {Promise<string[]>} Array of URIs for the uploaded files
     * @throws {Error} If upload fails or is aborted
     */
    const upload = async (
      files: GenericFile[], 
      options?: UploaderUploadOptions
    ): Promise<string[]> => {
      try {
        if (options?.signal?.aborted) {
          throw new Error('Upload aborted');
        }

        const account = await ensureStorageAccount();
  
        if (files.length === 1) {
          return [await uploadOne(files[0], options)];
        }

        const shadowFiles = files.map(file => ({
          name: file.uniqueName,
          file: Buffer.from(file.buffer),
        }));
  
        let completedFiles = 0;
        const totalFiles = files.length;
  
        const results = await drive.uploadMultipleFiles(
          new PublicKey(account),
          shadowFiles,
          concurrentUploads,
          overwriteExistingFiles,
          (batchSize: number) => {
            completedFiles += batchSize;
            const progress = (completedFiles / totalFiles) * 100;
            options?.onProgress?.(progress, batchSize);
          }
        );
        
        const failedResults = results.filter(result => result.status !== 'success');
        if (failedResults.length > 0) {
          console.error('Failed to upload the following files:');
          failedResults.forEach((result, index) => {
            console.error(`File ${index + 1}: ${result.fileName} - Error: ${result.status || 'Unknown error'}`);
          });
        }
  
        return results
          .filter(result => result.status === 'success')
          .map(result => result.location);
      } catch (error) {
        throw new Error(`Failed to upload multiple files to Shadow Drive: ${error}`);
      }
    };
  
    /**
     * Uploads JSON data as a file to SHDW Drive
     * @template T - The type of JSON data
     * @param {T} json - The JSON data to upload
     * @param {UploaderUploadOptions} [options] - Upload options including progress callback
     * @returns {Promise<string>} The URI of the uploaded JSON file
     */
    const uploadJson = async <T>(
      json: T, 
      options?: UploaderUploadOptions
    ): Promise<string> => {
      const file = createGenericFileFromJson(json);
      const uris = await upload([file], options);
      return uris[0];
    };
  
    /**
     * Calculates the price for uploading files
     * @param {GenericFile[]} files - Array of files to calculate price for
     * @param {UploaderGetUploadPriceOptions} [options] - Price calculation options
     * @returns {Promise<Amount>} The calculated price in lamports
     * @throws {Error} If operation is aborted
     */
    const getUploadPrice = async (
      files: GenericFile[],
      options?: UploaderGetUploadPriceOptions
    ): Promise<Amount> => {
      if (options?.signal?.aborted) {
        throw new Error('Operation aborted');
      }
        //SHDW based on storage in storage account
        return lamports(0);
    };
  
    return {
      upload,
      uploadJson,
      getUploadPrice,
    };
  }