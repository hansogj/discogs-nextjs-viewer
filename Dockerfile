# Use an official Node.js image as the base
FROM node:24-alpine

# Set the working directory
WORKDIR /app

# Copy manifest files needed before install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install pnpm
RUN npm install -g pnpm@12.6.0

# Install dependencies using pnpm
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Default command to run the application (can be overridden by docker-compose)
CMD ["pnpm", "dev"]
