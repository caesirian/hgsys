// Middleware de autenticación para rutas de administración interna.
// Solo hernan.garbarino@gmail.com (o quien tenga el ADMIN_SECRET)
// puede usar estas rutas. El secret se configura como variable de
// entorno en Render y nunca se commitea al repo.
export function adminAuth(req, res, next) {
  const secret = req.header('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado.' });
  }
  next();
}
