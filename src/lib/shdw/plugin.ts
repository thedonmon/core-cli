import { UmiPlugin } from '@metaplex-foundation/umi';
import { ShdwDrive } from '@shadow-drive/sdk';
import { createShdwUploader } from './createShdwUploader';
import { ShdwUploadOptions } from './shdwOptions';

/**
 * Creates a UMI plugin for SHDW Drive file uploads
 * @param {ShdwDrive} drive - The initialized SHDW Drive instance
 * @param {ShdwUploadOptions} options - Configuration options for SHDW uploads
 * @returns {UmiPlugin} A UMI plugin that installs the SHDW uploader
 */
export const shdwUploader = (
  drive: ShdwDrive,
  options: ShdwUploadOptions
): UmiPlugin => ({
  install(umi) {
    umi.uploader = createShdwUploader(drive, options);
  },
});