const jwt = require('jsonwebtoken');

// Valida el JWT emitido por auth-service (cabecera Authorization: Bearer <token>)
function requiereSesion(jwtSecret) {
  return (req, res, next) => {
    const [tipo, token] = String(req.get('authorization') || '').split(' ');
    if (tipo !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Debes iniciar sesión para solicitar medicamentos.' });
    }

    try {
      const payload = jwt.verify(token, jwtSecret);
      if (!payload.id || !payload.email) throw new Error('payload incompleto');
      req.usuario = { id: payload.id, email: payload.email, rol: payload.rol };
      return next();
    } catch {
      return res.status(401).json({ error: 'Tu sesión expiró o no es válida. Inicia sesión de nuevo.' });
    }
  };
}

module.exports = { requiereSesion };
