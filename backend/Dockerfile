# Base switched from node:20-alpine to node:20-slim (Debian/glibc, not
# musl) across every stage — onnxruntime-node (face-recognition/
# faceEmbedding.provider.ts's real MobileFaceNet model) ships no musl-
# compiled binary at all and fails outright on Alpine; this is a documented,
# confirmed incompatibility (github.com/microsoft/onnxruntime issues #2909,
# #8162, #9483), not a guess — this environment has no Docker to build/run
# this image directly, so the fix is applied on that documented evidence,
# not verified end-to-end here. sharp (already a dependency) ships both
# glibc and musl binaries, so it's unaffected either way; bcryptjs is pure
# JS. -slim is still meaningfully smaller than the full node:20 image.
#
# Then bumped 20 -> 22 across every stage: CI (ci-backend.yml, same base
# OS family as this image) caught onnxruntime-node@1.27 aborting with
# SIGABRT (exit 134) inside its native init path on Node 20, as soon as
# the face-recognition code touched a real model — passed the whole time
# in local dev, which runs Node 24. Never actually verified end-to-end by
# running this image (no Docker here — see above), but the Node-version
# fix is the same one that resolved the identical native-crash symptom in
# CI, on the same node:*-slim base family.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- build: compile TypeScript ---
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- production deps only ---
FROM node:22-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# --- runtime: minimal final image ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system app && useradd --system --gid app app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# The ONNX model file (backend/models/) isn't TypeScript, so `tsc` (the
# build stage) never copies it into dist/ on its own — copied explicitly
# here, from the same build-stage checkout, alongside the compiled code
# that loads it (faceEmbedding.provider.ts resolves the path relative to
# its own compiled location, three levels up to backend/, then into
# models/ — identical math whether running from src/ in dev or dist/ here).
COPY --from=build /app/models ./models
COPY package.json ./
USER app
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/v1/health/live', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "dist/server.js"]
