module.exports = [
  "strapi::logger",
  "global::v4-response-format",
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
      // Large uploads are multipart and only limited by maxFileSize below. Keep the
      // JSON/form/text limits modest: they apply to every route, including public ones.
      formLimit: "10mb",
      jsonLimit: "10mb",
      textLimit: "10mb",
      formidable: {
        maxFileSize: 200 * 1024 * 1024, // multipart data, modify here limit of uploaded file size
      },
    },
  },
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
