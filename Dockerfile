# Use an official Node.js image as the base
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy pnpm-lock.yaml and package.json to the working directory
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies using pnpm
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Default command to run the application (can be overridden by docker-compose)
CMD ["pnpm", "dev"]
