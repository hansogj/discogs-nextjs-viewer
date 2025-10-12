# Discogs Collection Viewer (Next.js Version)

This is a web application built with Next.js that allows you to view your Discogs record collection and wantlist. It uses the Discogs API for data and a simple in-memory cache for a fast and seamless experience during a session.

## Features

- **Next.js App Router**: Built with the latest Next.js features for optimal performance and developer experience.
- **Server-Side Rendering (SSR)**: Fast initial page loads.
- **Dedicated Routes**: Separate, shareable pages for `/collection` and `/wantlist`.
- **Secure Authentication**: User sessions are managed with encrypted, HTTP-only cookies.
- **In-Memory Caching**: Fetched data from Discogs is cached in memory for near-instant subsequent loads within a session.
- **Modern Dark UI**: A sleek, "Discogs-ish" dark mode interface.
- **Comprehensive Testing**: Includes unit tests with Vitest and end-to-end tests with Playwright.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later)
- [pnpm](https://pnpm.io/installation)
- A [Discogs](https://www.discogs.com) account.

### 1. Installation

Clone the repository and install the dependencies:

```bash
git clone <repository_url>
cd <repository_directory>
pnpm install
```

### 2. Environment Variables

You need to set up environment variables for the Discogs API and session security.

First, create a `.env.local` file in the root of the project by copying the example file:

```bash
cp .env.example .env.local
```

Now, fill in the values in `.env.local`:

#### Discogs Personal Access Token

1.  Go to your Discogs account settings: [Settings > Developers](https://www.discogs.com/settings/developers).
2.  Click "Generate new token" and give it a name.
3.  Copy the generated token. This token is required for the Playwright E2E tests to run successfully.

```env
# .env.local

# Used by Playwright for end-to-end testing login flow
E2E_DISCOGS_TOKEN="your_discogs_personal_access_token"
```

#### Auth Secret

This is a secret password used to encrypt the session cookie. Generate a long, random string (at least 32 characters). You can use a password generator or an online tool.

```env
# .env.local

# A long, secret string used to encrypt the session cookie (at least 32 characters)
AUTH_SECRET="your_super_secret_password_for_cookie_encryption"
```

### 3. Running the Application

To start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

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