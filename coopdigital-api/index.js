import express from 'express';
import cors from 'cors';
import { apiKeyAuth } from './src/middleware/api-key-auth.js';
import { adminAuth } from './src/middleware/admin-auth.js';
import { router as v1Router } from './src/routes/v1.js';
import { router as webauthnRouter } from './src/routes/auth-webauthn.js';
import { router as adminRouter } from './src/routes/admin.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => {
  res.json({
    service: 'CoopDigital API Pública',
    version: 'v1',
    docs: 'Enviar header x-api-key en cada request a /v1/*'
  });
});

app.use('/v1', apiKeyAuth, v1Router);
app.use('/auth/webauthn', webauthnRouter);

// Rutas de administración interna — solo hernan.garbarino@gmail.com
// vía x-admin-secret header (configurado en Render como ADMIN_SECRET).
app.use('/admin', adminAuth, adminRouter);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

app.listen(PORT, () => {
  console.log(`CoopDigital API escuchando en puerto ${PORT}`);
});
