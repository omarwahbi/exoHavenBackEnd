// module.exports = [
//   "strapi::logger",
//   "strapi::errors",
//   {
//     name: "strapi::security",
//     config: {
//       contentSecurityPolicy: {
//         useDefaults: true,
//         directives: {
//           "connect-src": ["'self'", "https:"],
//           "img-src": [
//             "'self'",
//             "data:",
//             "blob:",
//             "*.imagekit.io",
//             "https://ik.imagekit.io",
//             "https://ik.imagekit.io/*",
//           ],
//           "media-src": [
//             "'self'",
//             "data:",
//             "blob:",
//             "*.imagekit.io",
//             "https://ik.imagekit.io",
//             "https://ik.imagekit.io/*",
//           ],
//         },
//       },
//     },
//   },
//   "strapi::cors",
//   "strapi::poweredBy",
//   "strapi::query",
//   "strapi::body",
//   "strapi::session",
//   "strapi::favicon",
//   "strapi::public",
// ];
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
  {
    name: "strapi::cors",
    config: {
      enabled: true,
      origin: ['http://localhost:3001'], // Allow all origins (change this to specific domains in production)
      methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'], // Allowed headers
    },
  },
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];