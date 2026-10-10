module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  // Strapi's built-in MCP server at /mcp, for AI agents (Claude, Cursor, ...) to
  // read and edit content. Off unless MCP_ENABLED=true; it only accepts admin
  // tokens (Settings > Admin tokens), never content API tokens.
  mcp: {
    enabled: env.bool('MCP_ENABLED', false),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
