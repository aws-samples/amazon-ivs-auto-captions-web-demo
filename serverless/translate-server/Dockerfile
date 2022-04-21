FROM --platform=linux/amd64 node:lts-alpine
WORKDIR /usr/src/translate
COPY package.json ./package.json
RUN npm install --silent
COPY . ./
CMD node src/translate.js