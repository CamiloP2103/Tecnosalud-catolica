const jwt = require('jsonwebtoken');

// Valida el JWT emitido por auth-service (cabecera Authorization: Bearer <token>)
function requiereSesion(jwtSecret) {
  return (req, res, next) => {
    const [tipo, token] = String(req.get('authorization') || '').split(' ');
    if (tipo !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Debes iniciar sesión.' });
    }
    try {
      const payload = jwt.verify(token, jwtSecret);
      if (!payload.id || !payload.email) throw new Error('payload incompleto');
      req.usuario = { id: payload.id, email: payload.email, doc: payload.doc, rol: String(payload.rol || '').toUpperCase() };
      return next();
    } catch {
      return res.status(401).json({ error: 'Tu sesión expiró o no es válida. Inicia sesión de nuevo.' });
    }
  };
}

// Solo deja pasar usuarios con rol ADMIN (usar después de requiereSesion)
function requiereAdmin(req, res, next) {
  if (req.usuario?.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo un administrador puede acceder a esta información.' });
  }
  return next();
}

module.exports = { requiereSesion, requiereAdmin };
