# apps/api/Dockerfile

# ---- Stage 1: builder ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --frozen-lockfile 2>/dev/null || npm install
RUN npx prisma generate --schema=./prisma/schema.prisma

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Stage 2: production ----
FROM node:20-alpine AS production

# Install Python dependencies for DOCX generation; install openssl for Prisma
RUN apk add --no-cache python3 py3-pip gcc musl-dev python3-dev
RUN pip3 install --break-system-packages --no-cache-dir python-docx lxml
RUN python3 -c "from docx import Document; print('python-docx OK')"
RUN apk add --no-cache openssl

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

CMD ["sh", "-c", "MAX_RETRIES=10; i=0; until npx prisma migrate deploy --schema=./prisma/schema.prisma; do i=$((i+1)); echo \"Migration failed (attempt $i/$MAX_RETRIES), retrying in 5s...\"; [ $i -ge $MAX_RETRIES ] && echo 'Max retries reached, exiting.' && exit 1; sleep 5; done && node dist/index.js"]
