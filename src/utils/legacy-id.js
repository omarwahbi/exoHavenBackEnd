'use strict';

// Strapi v4 addressed entries by numeric id (/api/items/123), and the frontend, its
// sitemap and old links still do. Strapi v5 looks entries up by documentId and gives
// the published version a new numeric id every time it is published, so legacy_id
// keeps each entry's original v4 id (filled by database/migrations/*add-legacy-ids.js).

const LEGACY_ID_UIDS = ['api::item.item', 'api::category.category', 'api::sub-category.sub-category'];

const MAX_INT = 2147483647; // id and legacy_id are Postgres integer columns

// Maps a numeric id from a v4-style URL to the entry's documentId: first by its
// original v4 id, then by its current row id (entries created after the upgrade).
// Anything that is not a number is already a documentId and is returned unchanged.
const resolveDocumentId = async (strapi, uid, id) => {
  if (!/^\d{1,10}$/.test(String(id)) || Number(id) > MAX_INT) return id;
  const query = strapi.db.query(uid);
  const entry =
    (await query.findOne({ select: ['documentId'], where: { legacy_id: Number(id) }, orderBy: { id: 'asc' } })) ||
    (await query.findOne({ select: ['documentId'], where: { id: Number(id) } }));
  return entry ? entry.documentId : id;
};

// Controller methods that also accept the numeric v4 id in /api/<type>/:id.
const legacyIdController = (uid) => ({ strapi }) => ({
  async findOne(ctx) {
    ctx.params.id = await resolveDocumentId(strapi, uid, ctx.params.id);
    return super.findOne(ctx);
  },
});

// legacy_id belongs to the entry that had that id in v4: new and duplicated entries
// never get one, and saving in the admin cannot change it. Publishing copies the
// draft's value to the published version without going through this.
const protectLegacyIds = (strapi) => {
  strapi.documents.use(async (ctx, next) => {
    if (LEGACY_ID_UIDS.includes(ctx.uid) && ctx.params?.data) {
      if (ctx.action === 'create' || ctx.action === 'clone') {
        ctx.params.data = { ...ctx.params.data, legacy_id: null };
      } else if (ctx.action === 'update') {
        const { legacy_id, ...data } = ctx.params.data;
        ctx.params.data = data;
      }
    }
    return next();
  });
};

module.exports = { resolveDocumentId, legacyIdController, protectLegacyIds };
