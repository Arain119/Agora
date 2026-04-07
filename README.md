# Agora (Aliyun ECS)

This repository contains the **Alibaba Cloud ECS deployment** version of Agora: a minimal, OpenAI-compatible gateway + admin UI for NVIDIA Integrate API (`https://integrate.api.nvidia.com/v1`).

- App code lives in `webapp/`.
- Upstream provider is fixed to NVIDIA Integrate API.

## Deploy (Alibaba Cloud ECS / Ubuntu 22.04)

```bash
git clone git@github.com:Arain119/Agora.git
cd Agora/webapp

npm ci
npm run build
```

1) Create `webapp/.env` (do not commit it) and set at least `JWT_SECRET` and `PORT` (default `3001`).
2) Start with PM2:

```bash
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

3) Configure Nginx to serve `frontend/dist` and reverse-proxy `/api` and `/v1` to the backend.
   - Example: `webapp/deploy/nginx.agora.conf.example`
