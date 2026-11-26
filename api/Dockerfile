FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY schema.sql ./

ENV NODE_ENV=production
EXPOSE 8000

USER node
CMD ["npm", "start"]
