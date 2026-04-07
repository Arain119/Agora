# Agora (NVIDIA Integrate API Gateway)

Minimal OpenAI-compatible gateway + admin UI for NVIDIA Integrate API (`https://integrate.api.nvidia.com/v1`).

## Development

```bash
npm install
npm run dev
```

Backend runs on `http://127.0.0.1:3001` by default.

## Build

```bash
npm run build
npm start
```

## Notes

- Upstream provider is fixed to NVIDIA Integrate API.
- The project contains an invite-based auth flow and admin pages for managing upstream keys and user tokens.
