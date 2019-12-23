FROM node:12.13.1-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache ffmpeg

COPY ./ ./

RUN npm install && npm install -g @nestjs/cli && nest build

EXPOSE 3000/tcp

ENTRYPOINT ["npm", "run", "start:prod"]
