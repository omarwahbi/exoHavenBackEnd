# Builds the image deployed as omarwahbi/exohaven-strapi (see docker-compose.yml on the server).
FROM node:22-alpine AS build
# sharp (image processing) needs libvips to build on Alpine
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git
WORKDIR /opt/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
RUN apk add --no-cache vips vips-cpp
WORKDIR /opt/app
ENV NODE_ENV=production
COPY --from=build /opt/app ./
EXPOSE 1337
CMD ["npm", "run", "start"]
