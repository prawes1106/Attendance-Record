# Stage 1: Build React SPA
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Run Express API + Serve React SPA
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY --from=builder /app/dist ./dist
COPY server.ts ./
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.ts"]
