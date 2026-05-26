# --- Development stage ---
FROM node:22-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN npx prisma generate

CMD ["npm", "run", "start:dev"]

# --- Production stage ---
FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN npx prisma generate
RUN npm run build

CMD ["node", "dist/src/main.js"]
