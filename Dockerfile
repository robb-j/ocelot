FROM node:8-alpine

EXPOSE 3000

RUN mkdir -p /app
WORKDIR /app

COPY package.json /app
RUN npm install --silent --production

COPY web /app/web

CMD node web/index.js
