# Dev image para el backend Node + Express (watch mode)
FROM node:24-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]