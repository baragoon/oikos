# Oikos Web Installer

A browser-based setup wizard for Oikos. Run it once to configure your `.env`,
start Docker, and create your admin account.

## Usage

From the repository root:

```bash
node tools/installer/install-server.js
```

Then open **http://localhost:8090** in your browser.

The server shuts down automatically after setup completes (or after 30 minutes of inactivity).

## Requirements

- Node.js 18+
- Docker with Compose v2
- The repository cloned locally

## What it does

1. Guides you through all configuration options
2. Writes `.env` to the project root
3. Starts the Docker container (`docker compose up -d`)
4. Polls the health endpoint until the container is ready
5. Creates your first admin account via `POST /api/v1/auth/setup`
