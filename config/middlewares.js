module.exports = [
  "strapi::logger",
  "strapi::errors",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            "*.imagekit.io",
            "https://ik.imagekit.io",
            "https://ik.imagekit.io/*",
          ],
          "media-src": [
            "'self'",
            "data:",
            "blob:",
            "*.imagekit.io",
            "https://ik.imagekit.io",
            "https://ik.imagekit.io/*",
          ],
        },
      },
    },
  },
  // Default CORS (any origin): the API serves the public catalogue to the Vercel
  // frontend, including preview deployments on *.vercel.app.
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::query",
  {
    name: "strapi::body",
    config: {
      formLimit: "256mb", // modify form body
      jsonLimit: "256mb", // modify JSON body
      textLimit: "256mb", // modify text body
      formidable: {
        maxFileSize: 200 * 1024 * 1024, // multipart data, modify here limit of uploaded file size
      },
    },
  },
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
