# ExoHaven backend (Strapi)

Strapi 5 CMS behind https://admin.exohaven-iq.com, serving the catalogue to the
ExoHaven frontend (omarwahbi/exoHavenFront, deployed on Vercel). Deploying,
staging and rollback: see [deploy/README.md](deploy/README.md).

## Running it locally

Needs Node 22 (`.nvmrc`) and Docker for Postgres.

```sh
docker run -d --name exohaven-pg -p 127.0.0.1:5432:5432 \
  -e POSTGRES_DB=strapi_db -e POSTGRES_USER=strapi_user -e POSTGRES_PASSWORD=strapi \
  postgres:14.5-alpine
cp .env.example .env        # set POSTGRES_PASSWORD=strapi, fill the secrets:
                            # openssl rand -base64 32
npm ci
npm run develop             # admin at http://localhost:1337/admin
```

To work on real data, restore a backup into that container (the `sed` drops
ownership statements for users that don't exist locally):

```sh
gunzip -c backup.sql.gz | sed -E '/^ALTER .* OWNER TO /d' \
  | docker exec -i exohaven-pg psql -U strapi_user -d strapi_db -q
```

Leave the ImageKit keys unset locally: uploads then go to `public/uploads`, and
nothing you do can touch the live site's images.

## Checks

```sh
npm run lint   # ESLint on the server code
npm test       # unit tests (node --test, tests/*.test.js)
```

GitHub Actions runs both on every pull request, before it builds the Docker image.
Business rules (the item picker and publish checks, legacy ids) have tests in
`tests/`; add one when you add a rule.

## Content model

Categories, sub-categories and items use draft & publish. The frontend only sees
published entries.

| Type | Fields | Relations |
| --- | --- | --- |
| `category` | `name`, `desc`, `category_thumbnail` | has many `sub_categories` |
| `sub-category` | `name`, `subcategory_thumbnail` | belongs to one `category` |
| `item` | `name`, `description`, `state` (the price, IQD), `Item_ID`, `new_arrival`, `out_of_stock`, `low_stock`, `item_thumbnail`, `item_images`, `variants` | one `category`, one `sub_category` |
| `sale` (single type) | `active`, `percent`, `ends_at`, `show_banner`, `banner_text` | |

**Item categories.** In the admin, an item's category and sub-category are set
with one picker (`category_picker`, `src/admin/components/CategoryPicker.jsx`).
The sub-category list is disabled until a category is chosen, then lists only
that category's sub-categories. `src/utils/item-categories.js` copies the choice
into the `category` and `sub_category` relations, and rejects mismatched pairs.
Publishing an item requires a thumbnail, a category and a matching
sub-category.

**Variants.** An item can have variants (the repeatable `shop.variant` component,
`src/components/shop/variant.json`): a label such as "50W" or "Large", its own
price, an SKU, and out-of-stock / low-stock switches. When an item has variants,
the shop prices it by variant and the shopper picks one. Labels must be unique
within an item, because the cart tells variants apart by label.
`low_stock`, on an item or a variant, shows a "last piece" badge on the shop.

**Sale.** The site-wide discount the shop shows: on or off, a percentage, an
optional end date, and the banner across the top of the site (shown or not, and
its text; the "خصم N%" badge next to it follows the percentage). The public can read it at `/api/sale`. `src/utils/bootstrap.js`
grants that permission, and creates the entry on first start.

## Search

The shop's search box, product listings and their sorting go through
`GET /api/search` (public; `src/search/`, `src/api/search/`). Parameters: `q`,
`category`, `sub_category` (documentIds), `instock=1`, `sort` (`relevance`,
`featured`, `newest`, `price_asc`, `price_desc`, `name`), `page`, `pageSize` (max
48), and `suggest=1` to also get categories whose name matches. Results are items
in the usual API shape, so the shop shows them with its normal product card.

It uses [Meilisearch](https://www.meilisearch.com/) when `MEILISEARCH_URL` and
`MEILISEARCH_KEY` are set (production and staging run it next to Strapi), and the
database otherwise, or whenever Meilisearch doesn't answer. Meilisearch adds:

- typo tolerance ("مصبح" finds "مصباح");
- Arabic spelling variants: أ/إ/آ/ا, ة/ه, ى/ي, diacritics, and the article
  ("الإضاءة" finds "إضاءة"), see `src/search/normalize.js`;
- synonyms ("ضوء" finds "مصباح" and "lamp"), see `SYNONYM_GROUPS` in
  `src/search/meili.js`. Add words there, in any spelling;
- price sorting by the real price, including variants (the database sorts the
  `state` text, so "9000" comes after "10000");
- a match on every word typed first, then on most of them if nothing matches all.

The index is rebuilt from the published items each time Strapi starts, and kept
up to date as items, categories and sub-categories are published, edited or
deleted. Product codes (`Item_ID`, variant SKUs) are searchable and must match
exactly.

Change content types in the admin's Content-Type Builder while running
`npm run develop` locally, commit the generated `schema.json` changes, and ship
them through a pull request. Production runs `strapi start`, where the builder is
read-only.

### Ids and old links

Strapi 5 addresses entries by `documentId` (a string). The frontend links use it.
Links from before the upgrade used the numeric Strapi 4 id, which Strapi 5
changes on every publish. To keep those links working, each type has a private
`legacy_id` field:

- `database/migrations/…add-legacy-ids.js` filled it with the Strapi 4 ids;
- `src/utils/legacy-id.js` makes `GET /api/<type>/<number>` look an entry up by
  `legacy_id` first, and stops `legacy_id` from being set or changed through
  the API or admin (new entries get none).

The frontend turns old `/item/<number>` URLs into `documentId` URLs with a 308
redirect.

## Layout

- `config/` holds Strapi config: database, middlewares (CSP, CORS, body limits),
  and plugins (ImageKit upload, only when its keys are set).
- `src/api/` holds the three content types. Controllers, routes and services are
  Strapi defaults, apart from the `legacy_id` lookup.
- `providers/strapi-provider-upload-exohaven-imagekit/` is the ImageKit upload
  provider, kept in the repo.
- `database/migrations/` holds the project's database migrations. They run on
  startup, before Strapi's own.
- `types/generated/` is regenerated by Strapi from the schemas. Don't edit it by
  hand.
- `deploy/` holds the production and staging compose files, the staging refresh
  script, and the runbook.

## AI agents (MCP)

Strapi 5 has a built-in MCP server, so an AI agent such as Claude can read and edit
the catalogue (bulk-fix categories, write descriptions, find items without
thumbnails). It is off by default. To turn it on:

1. Set `MCP_ENABLED=true` in the server's `.env` and restart Strapi.
2. In the admin, go to Settings → Admin tokens, and create a token. Give it the
   least access the job needs, and an expiry date.
3. Point the agent at `https://admin.exohaven-iq.com/mcp` with that token as a
   `Bearer` token.

The agent can do everything the token's owner can, including the validation
rules above, so try it on staging first. Content API tokens don't work for /mcp.

Strapi's other built-in AI (the Content-Type Builder assistant, AI translations)
needs a paid Growth plan, so it isn't used here.

