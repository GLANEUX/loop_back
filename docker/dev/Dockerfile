FROM node:20-slim AS development

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=development

EXPOSE 3001

CMD ["npm", "run", "start:dev"]
