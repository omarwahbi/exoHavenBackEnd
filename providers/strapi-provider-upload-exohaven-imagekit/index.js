'use strict';

// Uploads Strapi media to ImageKit. It replaces strapi-provider-upload-imagekit 5.x,
// which only logs failed uploads and deletes (so a failed upload saved an entry with
// no image) and uploads with useUniqueFileName: false (so files with the same name
// overwrite each other). Behaves like the 4.x provider production used: same SDK,
// file name and folder, and errors reach Strapi and the admin.

const ImageKit = require('imagekit');

const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

module.exports = {
  init({ publicKey, privateKey, urlEndpoint, params = {} }) {
    const imagekit = new ImageKit({ publicKey, privateKey, urlEndpoint });
    const folder = params.folder || '/';

    const upload = async (file) => {
      const buffer = file.buffer || (await streamToBuffer(file.stream));
      const { fileId, url } = await imagekit.upload({
        file: buffer,
        fileName: `${file.hash}${file.ext}`,
        folder,
      });
      file.url = url;
      file.provider_metadata = { fileId };
    };

    return {
      upload,
      uploadStream: upload,
      async delete(file) {
        const fileId = file.provider_metadata?.fileId;
        if (!fileId) return;
        try {
          await imagekit.deleteFile(fileId);
        } catch (error) {
          // Already gone from ImageKit: nothing left to delete.
          if (error?.$ResponseMetadata?.statusCode !== 404) throw error;
        }
      },
    };
  },
};
