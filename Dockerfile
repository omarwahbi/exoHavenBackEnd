# Builds the image deployed as omarwahbi/exohaven-strapi (see docker-compose.yml on the server).
FROM node:22-alpine AS build
# sharp (image processing) compiles against libvips on Alpine
RUN apk add --no-cache build-base gcc zlib-dev libpng-dev vips-dev
WORKDIR /opt/app
COPY package.json package-lock.json ./
# local packages referenced from package.json (file:providers/...)
COPY providers ./providers
RUN npm ci
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:22-alpine
# Only the libvips runtime libraries are needed to run sharp
RUN apk add --no-cache vips vips-cpp
WORKDIR /opt/app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /opt/app ./
USER node
EXPOSE 1337
CMD ["npm", "run", "start"]
