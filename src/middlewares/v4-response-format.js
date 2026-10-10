'use strict';

// Serves the content API in the Strapi v4 response format ({ id, attributes: {...} })
// unless a client asks for another one, so the frontend keeps working unchanged on v5.
// Remove once the frontend reads the v5 format.
module.exports = () => async (ctx, next) => {
  if (ctx.path.startsWith('/api/') && !ctx.request.headers['strapi-response-format']) {
    ctx.request.headers['strapi-response-format'] = 'v4';
  }
  await next();
};
