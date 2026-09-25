FROM node:22-alpine AS build
WORKDIR /src

COPY SportTracker.Web/package.json SportTracker.Web/package-lock.json ./
RUN npm ci

COPY SportTracker.Web/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /src/dist /usr/share/nginx/html
COPY SportTracker.Web/nginx.conf /etc/nginx/conf.d/default.conf
