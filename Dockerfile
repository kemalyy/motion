# ─────────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install libc6-compat for Alpine + native deps (bcrypt)
RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─────────────────────────────────────────────
# Stage 2: Build
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone mode)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─────────────────────────────────────────────
# Stage 3: Production Runner
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# System dependencies: pdf2svg, python3, PyMuPDF
RUN apk add --no-cache \
    pdf2svg \
    python3 \
    py3-pip \
    poppler-utils \
    libc6-compat \
    && pip3 install --break-system-packages PyMuPDF \
    && rm -rf /root/.cache

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema (needed for migrations)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy Python scripts
COPY --from=builder /app/scripts ./scripts

# Create upload directory
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# Set environment defaults
ENV UPLOAD_DIR=/app/uploads
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start server
CMD ["node", "server.js"]
