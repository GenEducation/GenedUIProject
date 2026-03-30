FROM node:20-alpine

WORKDIR /app

# Ensure we have build tools just in case
RUN apk add --no-cache python3 make g++

COPY apps/web/package.json ./
# Clean install to generate fresh lock for the container architecture
RUN npm install

COPY apps/web/ .
COPY shared/ /shared

EXPOSE 3000

# Remove .next to avoid stale build artifacts
CMD ["sh", "-c", "rm -rf .next && npm run dev"]
