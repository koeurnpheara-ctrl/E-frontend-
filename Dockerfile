FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_PRODUCTS_ENDPOINT=/products
ARG VITE_CATEGORIES_ENDPOINT=/categories

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_PRODUCTS_ENDPOINT=$VITE_PRODUCTS_ENDPOINT \
    VITE_CATEGORIES_ENDPOINT=$VITE_CATEGORIES_ENDPOINT

RUN npm run build

FROM nginx:alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
