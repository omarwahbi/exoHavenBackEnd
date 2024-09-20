const ImageKit = require("imagekit");

module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: "strapi-provider-upload-imagekit",
      providerOptions: {
        publicKey: env("IMAGEKIT_PUBLIC_KEY"),
        privateKey: env("IMAGEKIT_PRIVATE_KEY"),
        urlEndpoint: env("IMAGEKIT_URL_ENDPOINT"),
      },
      actionOptions: {
        upload: async (file) => {
          return new Promise((resolve, reject) => {
            const uploadFile = Buffer.from(file.buffer, "binary");

            // ImageKit Upload Logic
            const imagekit = new ImageKit({
              publicKey: env("IMAGEKIT_PUBLIC_KEY"),
              privateKey: env("IMAGEKIT_PRIVATE_KEY"),
              urlEndpoint: env("IMAGEKIT_URL_ENDPOINT"),
            });

            imagekit.upload(
              {
                file: uploadFile,
                fileName: file.name,
                folder: "/uploads",
              },
              (error, result) => {
                if (error) {
                  console.error("Error uploading to ImageKit:", error);
                  return reject(error);
                }
                file.url = result.url;
                file.provider_metadata = { fileId: result.fileId };
                resolve();
              }
            );
          });
        },
        delete: async (file) => {
          return new Promise((resolve, reject) => {
            if (file.provider_metadata && file.provider_metadata.fileId) {
              const imagekit = new ImageKit({
                publicKey: env("IMAGEKIT_PUBLIC_KEY"),
                privateKey: env("IMAGEKIT_PRIVATE_KEY"),
                urlEndpoint: env("IMAGEKIT_URL_ENDPOINT"),
              });

              const fileId = file.provider_metadata.fileId;
              imagekit.deleteFile(fileId, (error) => {
                if (error) {
                  return reject(error);
                }
                resolve();
              });
            } else {
              reject(new Error("FileId not found in provider metadata."));
            }
          });
        },
      },
    },
  },
});
