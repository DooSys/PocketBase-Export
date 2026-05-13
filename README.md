# PocketBase Export

PocketBase Export is a small companion web app for exporting PocketBase collection data through the official HTTP API.

It runs next to your PocketBase instance. It does not read SQLite directly and it is not installed inside PocketBase.

## Features

- Superuser login with automatic collection discovery.
- API user login with a custom auth collection and a manually selected export collection.
- CSV, JSON and XLSX exports.
- Optional ZIP compression.
- Filters, sorting, selected fields and relation expansion.
- Light/dark mode.
- French and English UI.
- No password storage.

## Auth Modes

### Superuser

Use this mode when you want an admin-style export interface.

- Authenticates against `_superusers`.
- Can list collections through the PocketBase collections API.
- Shows collection metadata such as field count.

### API User

Use this mode when you want exports constrained by PocketBase API rules.

- Authenticates against a custom auth collection, for example `User_API`.
- Requires the export collection name.
- Does not list all collections because PocketBase collection discovery requires admin/superuser access.

## Local Development

Requirements:

- Node.js 20+
- A reachable PocketBase instance

```bash
npm install
npm run dev
```

Default URLs:

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3000`
- PocketBase default target: `http://127.0.0.1:8090`

Copy `.env.example` to `.env` when you want local overrides.

## Environment

```env
PB_URL=http://127.0.0.1:8090
PB_CONNECT_TIMEOUT_MS=30000
PB_REQUEST_TIMEOUT_MS=45000
API_PORT=3000
WEB_PORT=5173
CORS_ORIGIN=http://127.0.0.1:5173
```

In development, the React app calls the Fastify API through the Vite proxy. This is why browser requests go to `localhost:3000` for `/api/*`.

## Docker

Build locally:

```bash
docker build -t pocketbase-export:0.1.0 .
docker run --rm -p 3000:3000 -e PB_URL=http://host.docker.internal:8090 pocketbase-export:0.1.0
```

With Docker Compose:

```bash
docker compose up --build
```

The exporter is available at:

```txt
http://127.0.0.1:3000
```

## Example Compose With PocketBase

```yaml
services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb_data

  pocketbase-export:
    image: ghcr.io/doosys/pocketbase-export:latest
    ports:
      - "3000:3000"
    environment:
      PB_URL: http://pocketbase:8090
      API_PORT: 3000
    depends_on:
      - pocketbase
```

## Versioning

This project uses semantic versioning:

- `0.1.0`: first usable release
- `0.2.0`: new features
- `0.2.1`: bug fixes
- `1.0.0`: stable public release

Create a release tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Tags starting with `v` publish a Docker image to GitHub Container Registry.

## Docker Images

Expected image names:

```txt
ghcr.io/doosys/pocketbase-export:latest
ghcr.io/doosys/pocketbase-export:0.1.0
```

## Security Notes

- Passwords are never stored.
- Recent URLs and collection names are stored in browser `localStorage` for convenience.
- API user exports are constrained by PocketBase API rules.
- Superuser mode should only be used by trusted operators.

## Roadmap

- Export presets.
- Multi-collection ZIP exports.
- File field export support.
- Better progress reporting for very large exports.
- Optional scheduled exports.
- CLI mode.

## License

MIT
