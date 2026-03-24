FROM node:24-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# The test will run setup in non-interactive mode
CMD ["node", "--import", "tsx", "test/setup.test.ts"]
