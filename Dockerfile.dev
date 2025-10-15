FROM node:slim AS development

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=development

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
