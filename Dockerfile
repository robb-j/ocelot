FROM node:8-alpine

WORKDIR /app

COPY package.json /app
RUN npm install --silent --production

COPY web /app/web

CMD node web
