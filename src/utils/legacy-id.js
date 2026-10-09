'use strict';

// Strapi v4 addressed entries by numeric id (/api/items/123), and the frontend, its
// sitemap and old links still do. Strapi v5 looks entries up by documentId and gives
// the published version a new numeric id every time it is published, so legacy_id
// keeps each entry's original v4 id (filled by database/migrations/*add-legacy-ids.js).

// Maps a numeric id from a v4-style URL to the entry's documentId: first by its
// original v4 id, then by its current row id (entries created after the upgrade).
// Anything that is not a number is already a documentId and is returned unchanged.
const resolveDocumentId = async (strapi, uid, id) => {
  if (!/^\d+$/.test(String(id))) return id;
  const query = strapi.db.query(uid);
  const entry =
    (await query.findOne({ select: ['documentId'], where: { legacy_id: Number(id) } })) ||
    (await query.findOne({ select: ['documentId'], where: { id: Number(id) } }));
  return entry ? entry.documentId : id;
};

module.exports = { resolveDocumentId };
