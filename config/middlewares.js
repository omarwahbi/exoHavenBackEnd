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
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
