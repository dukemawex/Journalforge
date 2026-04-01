# apps/api/Dockerfile

# ---- Stage 1: builder ----
FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --frozen-lockfile 2>/dev/null || npm install
RUN npx prisma generate --schema=./prisma/schema.prisma

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Stage 2: production ----
FROM node:20-slim AS production

# Install Python dependencies for DOCX generation; install openssl for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    python3-pip \
    python3-dev \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages \
    --no-cache-dir \
    python-docx \
    lxml

RUN python3 -c "from docx import Document; print('python-docx OK')"

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
