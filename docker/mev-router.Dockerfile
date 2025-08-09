# Simple container for MEV router script
FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy project
COPY . .

# Default environment variables (override in runtime)
ENV NODE_ENV=production

# Run the router (requires env like PRIVATE_RELAYS/BUNDLER_URLS/ENTRYPOINT/PK/CHAIN_ID)
ENTRYPOINT ["node", "scripts/mevRouter.js"]
