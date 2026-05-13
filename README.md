<p align="center">
  <img width="447" height="557" alt="image" src="https://github.com/user-attachments/assets/a5d269fd-4e70-4c0b-b3d8-25fe760b1163" />
</p>

# PocketBase Export

<p align="center">
  <a href="https://github.com/DooSys/PocketBase-Export/releases">
    <img alt="Version" src="https://img.shields.io/badge/version-0.1.0-brightgreen" />
  </a>
  <a href="./LICENSE">
    <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-blue" />
  </a>
  <img alt="Node.js 20+" src="https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-5.7-3178C6?logo=typescript&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=111111" />
  <img alt="Vite" src="https://img.shields.io/badge/vite-6-646CFF?logo=vite&logoColor=white" />
  <img alt="Fastify" src="https://img.shields.io/badge/fastify-5-000000?logo=fastify&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/docker-GHCR-2496ED?logo=docker&logoColor=white" />
</p>

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
<img width="475" height="495" alt="image" src="https://github.com/user-attachments/assets/758d9379-73c6-48c7-bdad-5e45eb5ba6d1" />


### API User

Use this mode when you want exports constrained by PocketBase API rules.

- Authenticates against a custom auth collection, for example `User_API`.
- Requires the export collection name.
- Does not list all collections because PocketBase collection discovery requires admin/superuser access.
<img width="472" height="668" alt="image" src="https://github.com/user-attachments/assets/1c75360d-5e0a-4a9f-a2b2-f514379e2864" />

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
