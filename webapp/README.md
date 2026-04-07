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

## Deploy (Alibaba Cloud ECS / Ubuntu 22.04)

This project is intended to be deployed on an **Alibaba Cloud ECS** instance (Ubuntu 22.04 recommended).

### 1) Install & build

```bash
git clone git@github.com:Arain119/Agora.git
cd Agora/webapp

npm ci
npm run build
```

### 2) Configure environment

Create `webapp/.env` (do not commit it):

```bash
PORT=3001
JWT_SECRET=change_me
```

### 3) Run backend with PM2

```bash
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

### 4) Nginx reverse proxy (recommended)

- Serve SPA from `webapp/frontend/dist`
- Reverse proxy `/api` and `/v1` to `http://127.0.0.1:3001`
- Example config: `webapp/deploy/nginx.agora.conf.example`

## Notes

- Upstream provider is fixed to NVIDIA Integrate API.
- The project contains an invite-based auth flow and admin pages for managing upstream keys and user tokens.
