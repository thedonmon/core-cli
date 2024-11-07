/**
 * Configuration options for SHDW file uploads
 * @interface ShdwUploadOptions
 * @property {string} [storageAccount] - The storage account identifier
 * @property {boolean} [createStorageAccountIfNotExist] - Whether to create a storage account if it doesn't exist
 * @property {number} [concurrentUploads] - Number of files to upload simultaneously
 * @property {boolean} [overwriteExistingFiles] - Whether to overwrite files if they already exist
 * @property {number} [defaultStorageSize] - Default storage size in GB
 */
export type ShdwUploadOptions = {
    storageAccount?: string,
    createStorageAccountIfNotExist?: boolean,
    concurrentUploads?: number,
    overwriteExistingFiles?: boolean,
    defaultStorageSize?: number,
}

/**
 * Returns the default SHDW upload options
 * @returns {ShdwUploadOptions} Default configuration for SHDW uploads
 */
export const getDefaultOptions = (): ShdwUploadOptions => {
    return {
        createStorageAccountIfNotExist: true,
        overwriteExistingFiles: false,
        concurrentUploads: 2,
        defaultStorageSize: 1
    }
}

/**
 * Creates a custom SHDW upload options object
 * @param {string} [storageAccount] - The storage account identifier
 * @param {boolean} [overwriteExistingFiles=false] - Whether to overwrite existing files
 * @param {boolean} [createStorageAccountIfNotExist=false] - Whether to create a storage account if it doesn't exist
 * @param {number} [defaultStorageSize] - Default storage size in GB
 * @param {number} [concurrentUploads=2] - Number of files to upload simultaneously
 * @returns {ShdwUploadOptions} Custom configuration for SHDW uploads
 */
export const createOptions = (storageAccount?: string, overwriteExistingFiles: boolean = false, createStorageAccountIfNotExist: boolean = false, defaultStorageSize?: number, concurrentUploads: number = 2) => {
    return {
        storageAccount,
        overwriteExistingFiles,
        createStorageAccountIfNotExist,
        concurrentUploads,
        defaultStorageSize
    }
}