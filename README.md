# Discogs Collection Viewer (Next.js Version)

This is a web application built with Next.js that allows you to view your Discogs record collection and wantlist. It uses the Discogs API for data and a local file-based cache for a fast and seamless experience across sessions.

## Features

- **Next.js App Router**: Built with the latest Next.js features for optimal performance and developer experience.
- **Server-Side Rendering (SSR)**: Fast initial page loads.
- **Dedicated Routes**: Separate, shareable pages for `/collection` and `/wantlist`.
- **Secure Authentication**: User sessions are managed with encrypted, HTTP-only cookies.
- **File-based Caching**: Fetched data from Discogs is cached in the local filesystem (`.next/cache/`) to prevent hitting API rate limits and for near-instant loads across server restarts.
- **Modern Dark UI**: A sleek, "Discogs-ish" dark mode interface.
- **Comprehensive Testing**: Includes unit tests with Vitest and end-to-end tests with Playwright.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later)
- [pnpm](https://pnpm.io/installation)
- [Docker](https://www.docker.com/get-started) (for running Redis)
- A [Discogs](https://www.discogs.com) account.

### 1. Installation

Clone the repository and install the dependencies:

```bash
git clone <repository_url>
cd <repository_directory>
pnpm install
```

### 2. Environment Variables

You need to set up environment variables for the Discogs API, Redis connection, and session security. These variables will be used by the application directly or passed to Docker containers when using `docker compose`.

First, create a `.env` file in the root of the project by copying the example file:

```bash
cp .env.example .env
```

Now, fill in the values in `.env`:

#### Discogs API Keys

These are required for the application to fetch your Discogs collection and wantlist.

1.  Go to your Discogs account settings: [Settings > Developers](https://www.discogs.com/settings/developers).
2.  Create a new application or use an existing one.
3.  Copy your **Consumer Key** and **Consumer Secret**.

```env
# .env

DISCOGS_API_KEY="your_discogs_consumer_key"
DISCOGS_API_SECRET="your_discogs_consumer_secret"
```

#### Auth Secret

This is a secret key used to encrypt the session cookie. Generate a long, random string (at least 32 characters). You can use `openssl rand -hex 32` in your terminal.

```env
# .env

AUTH_SECRET="your_super_secret_password_for_cookie_encryption"
```

#### Redis Password

This password is used by the Docker Compose setup for the Redis container. It should match the password set in `REDIS_URL`.

```env
# .env

REDIS_PASSWORD="yourpassword" # Or a strong, secret password
```

#### Redis URL

The application uses Redis for caching and managing the sync queue. The `docker-compose.yml` (located in the `compose/` directory) sets up a Redis instance as a service named `cache`. This URL points to that internal Docker service, using the `REDIS_PASSWORD` for authentication.

```env
# .env

REDIS_URL="redis://:${REDIS_PASSWORD}@cache:6379"
```

### 3. Running the Application

This application can be started using `docker compose` from within the `compose/` directory. This will build the necessary images, start the Redis database, the Next.js web server, and the background worker.

#### 3.1. Build and Run Services with Docker Compose

Ensure Docker is running, then navigate to the `compose/` directory and execute:

```bash
cd compose
docker compose --env-file ../.env up --build -d
# Go back to the project root after starting services
cd ..
```

- `--build`: Builds the Docker images before starting the containers.
- `-d`: Runs the containers in detached mode (in the background).

- `--build`: Builds the Docker images before starting the containers.
- `-d`: Runs the containers in detached mode (in the background).

#### 3.2. Access the Application

Once the services are up, the web application will be accessible at [http://localhost:3000](http://localhost:3000) in your browser.

To view logs from all services, run:

```bash
docker compose logs -f
```

To stop the services, run:

```bash
docker compose down
```

## Running Tests

### Unit & Component Tests

The project uses Vitest for unit tests. To run them:

```bash
pnpm test
```

### End-to-End (E2E) Tests

The project uses Playwright for E2E tests. These tests simulate real user interactions in a browser.

First, install the browser dependencies for Playwright:

```bash
pnpm playwright install
```

Then, run the tests:

```bash
pnpm test:e2e
```

This will run the tests in headless mode. To see the browser UI during testing, use `pnpm test:e2e:ui`.
