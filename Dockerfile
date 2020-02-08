FROM node:12.13.1-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache ffmpeg

COPY ./src ./src
COPY ./nest-cli.json ./package.json ./package-lock.json ./tsconfig.build.json ./tsconfig.json ./tslint.json ./

RUN npm install && npm install -g @nestjs/cli && nest build

EXPOSE 3000/tcp

ENTRYPOINT ["npm", "run", "start:prod"]
