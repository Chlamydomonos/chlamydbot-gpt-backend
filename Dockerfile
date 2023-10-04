FROM node:latest

RUN mkdir /app
WORKDIR /app
ADD ./package.json /app/package.json
ADD ./tsconfig.json /app/tsconfig.json
ADD ./src /app/src
RUN npm install
RUN npm run build