import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiKeyAuth } from './src/middleware/api-key-auth.js';
import { adminAuth } from './src/middleware/admin-auth.js';
import { router as v1Router } from './src/routes/v1.js';
import { router as webauthnRouter } from './src/routes/auth-webauthn.js';
import { router as adminRouter } from './src/routes/admin.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Panel de administración: HTML standalone servido directo desde el
// backend, sin depender de abrirlo local ni de GitHub Pages.
app.get('/admin-panel.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-panel.html'));
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
