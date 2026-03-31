# apps/api/Dockerfile

# ---- Stage 1: builder ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --frozen-lockfile 2>/dev/null || npm install
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Stage 2: production ----
FROM node:20-alpine AS production

# Install Python, pip, and python-docx; install openssl for Prisma
RUN apk add --no-cache python3 py3-pip openssl \
    && pip3 install python-docx --break-system-packages

WORKDIR /app

# Copy compiled output from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy the Python build script
COPY src/scripts/build_docx.py ./dist/scripts/build_docx.py

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/index.js"]
