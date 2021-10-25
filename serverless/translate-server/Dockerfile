FROM node:lts-alpine
WORKDIR /usr/src/translate
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
RUN npm install --silent
COPY . ./
CMD node src/translate.js