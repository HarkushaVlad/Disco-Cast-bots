FROM node:20

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npx nx reset
RUN rm -rf node_modules/.cache/nx

RUN npm install -g nx
RUN npx prisma generate

CMD ["nx", "serve", "telegram-bot", "--configuration", "production", "--verbose"]
