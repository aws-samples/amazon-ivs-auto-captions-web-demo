FROM node:lts-alpine
WORKDIR /usr/src/transcribe
RUN apk add --no-cache --virtual .gyp python3 make g++ ffmpeg
COPY . ./
RUN npm install --silent
RUN chmod +x run.sh
CMD sh run.sh