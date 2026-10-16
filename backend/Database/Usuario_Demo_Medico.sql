USE db_auth;

-- Cuenta de prueba para el rol medico. Cambia esta contrasena antes de usarla fuera de desarrollo.
INSERT INTO usuarios (tipo_doc, documento, email, contrasena_hash, nombre, rol_id, activo) VALUES
  ('CC', '9999999998', 'doctor@tecnosalud.com.co', '$2a$10$FokbdJsRAC5DU9VJRp6xy.V3.qsJ9s2b6qm3XgzRFtwYIF5/EllYW', 'Doctor de Prueba', 2, TRUE)
ON DUPLICATE KEY UPDATE
  contrasena_hash = VALUES(contrasena_hash),
  nombre = VALUES(nombre),
  rol_id = VALUES(rol_id),
  activo = TRUE;
