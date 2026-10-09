module.exports = ({ env }) => ({
  // Media goes to ImageKit only when its keys are set (production). Without them
  // (staging, local dev) Strapi uses its default local upload provider, so a
  // staging database copy can never upload to or delete production's ImageKit files.
  ...(env("IMAGEKIT_PRIVATE_KEY") && {
    upload: {
      config: {
        provider: "strapi-provider-upload-exohaven-imagekit", // providers/ in this repo
        providerOptions: {
          publicKey: env("IMAGEKIT_PUBLIC_KEY"),
          privateKey: env("IMAGEKIT_PRIVATE_KEY"),
          urlEndpoint: env("IMAGEKIT_URL_ENDPOINT"),
        },
      },
    },
  }),
});
