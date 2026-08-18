# Dev image para el backend Node + Express (watch mode)
FROM node:24-alpine

# Dependencias del sistema para Chromium (Puppeteer-core apunta al binario del
# sistema vía PUPPETEER_EXECUTABLE_PATH). ttf-freefont da fuentes base para el PDF.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Instala puppeteer-core sin que trate de descargar Chrome (no aplica a `core`)
COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]