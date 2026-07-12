FROM nikolaik/python-nodejs:python3.10-nodejs20-slim

WORKDIR /app

# Install system dependencies that might be needed by pandas/numpy
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY a1build/requirements.txt /app/a1build/
RUN pip install --no-cache-dir -r /app/a1build/requirements.txt

# Install Node.js dependencies
COPY concord-frontend/package.json /app/concord-frontend/
COPY concord-frontend/pnpm-lock.yaml /app/concord-frontend/
COPY concord-frontend/patches /app/concord-frontend/patches/

WORKDIR /app/concord-frontend
RUN pnpm install
RUN pnpm run build

# Copy the rest of the workspace
WORKDIR /app
COPY . /app/

# Set working directory to frontend to run the Express server
WORKDIR /app/concord-frontend

# The Express server is written in TypeScript, so we need ts-node installed globally to run it directly
RUN npm install -g ts-node typescript

EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

# Run the express server
CMD ["npx", "ts-node", "server/index.ts"]
