# Plataforma Digital de Cartillas UNNA

## Ejecutar

```bash
cp .env.example .env
docker compose up -d
cd backend && npm install && npm run dev
```

En otra terminal:

```bash
cd frontend && npm install && npm run dev
```

Verificación: `curl http://localhost:3000/api/health`
