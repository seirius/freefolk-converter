FROM node:12.13.1-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache ffmpeg

COPY ./ ./

RUN npm install && npm install -g typescript && tsc

EXPOSE 3000/tcp

ENTRYPOINT ["node", "lib/app.js"]
