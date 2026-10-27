const jwt = require('jsonwebtoken');

// 1. Verifica que el usuario tenga un token válido
const requiereSesion = (jwtSecret) => (req, res, next) => {
  const authHeader = req.get('authorization') || '';
  const [tipo, token] = authHeader.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Debes iniciar sesión para realizar esta acción.' });
  }

  try {
    req.usuario = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Tu sesión expiró o no es válida. Inicia sesión de nuevo.' });
  }
};

// 2. Verifica que el usuario tenga el rol de ADMIN
const requiereAdmin = (req, res, next) => {
  if (!req.usuario || String(req.usuario.rol || '').toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere privilegios de administrador.' });
  }
  return next();
};

// 3. Validador genérico de roles por si tu admin.js usa requiereRol('ADMIN') en lugar de requiereAdmin
const requiereRol = (rolEsperado) => (req, res, next) => {
  if (!req.usuario || String(req.usuario.rol || '').toUpperCase() !== String(rolEsperado).toUpperCase()) {
    return res.status(403).json({ error: 'Acceso denegado. No tienes el rol necesario.' });
  }
  return next();
};

module.exports = { requiereSesion, requiereAdmin, requiereRol };