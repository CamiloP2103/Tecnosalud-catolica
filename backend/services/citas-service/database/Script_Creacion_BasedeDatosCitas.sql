-- ========================================================
-- Script de creación y poblamiento - db_citas (MySQL 8.0+)
-- Base de datos PROPIA del microservicio de Citas médicas
-- ========================================================
-- Especialidades, sedes, médicos, horarios de atención y citas reservadas.
-- Los médicos y sus registros son FICTICIOS (datos de demostración).
-- La disponibilidad no se guarda: se calcula con los horarios menos las citas programadas.
-- Volver a ejecutar el script es seguro: no duplica datos ni borra citas.

CREATE DATABASE IF NOT EXISTS db_citas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_citas;

-- 1. Especialidades y duración de cada consulta
CREATE TABLE IF NOT EXISTS especialidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  descripcion VARCHAR(200) NULL,
  duracion_min INT NOT NULL DEFAULT 30,
  activa BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- 2. Sedes de atención de Tecnosalud
CREATE TABLE IF NOT EXISTS sedes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  zona VARCHAR(80) NOT NULL,
  municipio VARCHAR(60) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- 3. Médicos (cada uno atiende una especialidad en una sede)
CREATE TABLE IF NOT EXISTS medicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  registro_medico VARCHAR(20) NOT NULL UNIQUE,
  especialidad_id INT NOT NULL,
  sede_id INT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_medico_especialidad FOREIGN KEY (especialidad_id) REFERENCES especialidades(id),
  CONSTRAINT fk_medico_sede FOREIGN KEY (sede_id) REFERENCES sedes(id)
) ENGINE=InnoDB;

-- 4. Horarios semanales de atención (dia_semana: 1 = lunes ... 7 = domingo)
CREATE TABLE IF NOT EXISTS horarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medico_id INT NOT NULL,
  dia_semana TINYINT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  CONSTRAINT fk_horario_medico FOREIGN KEY (medico_id) REFERENCES medicos(id),
  CONSTRAINT uq_horario UNIQUE (medico_id, dia_semana, hora_inicio),
  CONSTRAINT chk_horario_dia CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT chk_horario_rango CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB;

-- 5. Citas reservadas por los usuarios
-- `activa` vale 1 solo mientras la cita está PROGRAMADA (NULL en los demás estados). El índice único
-- (medico_id, fecha, hora, activa) impide reservar dos veces el mismo horario, incluso si dos personas
-- lo intentan al mismo tiempo, y permite volver a reservar un horario cuya cita se canceló.
CREATE TABLE IF NOT EXISTS citas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,                 -- db_auth.usuarios.id (viene en el JWT)
  usuario_email VARCHAR(120) NOT NULL,     -- db_auth.usuarios.email (para el correo de confirmación)
  usuario_doc VARCHAR(20) NOT NULL,        -- db_auth.usuarios.documento
  medico_id INT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  motivo VARCHAR(300) NULL,
  estado ENUM('PROGRAMADA', 'ATENDIDA', 'NO_ASISTIO', 'CANCELADA') NOT NULL DEFAULT 'PROGRAMADA',
  activa TINYINT GENERATED ALWAYS AS (IF(estado = 'PROGRAMADA', 1, NULL)) STORED,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cita_medico FOREIGN KEY (medico_id) REFERENCES medicos(id),
  CONSTRAINT uq_cita_activa UNIQUE (medico_id, fecha, hora, activa),
  INDEX idx_cita_usuario (usuario_id, fecha),
  INDEX idx_cita_fecha (fecha, estado)
) ENGINE=InnoDB;

-- Poblamiento: especialidades (las mismas que muestra el portal)
INSERT INTO especialidades (nombre, descripcion, duracion_min) VALUES
  ('Medicina General', 'Consulta de atención primaria y control', 20),
  ('Cardiología', 'Corazón y sistema circulatorio', 30),
  ('Dermatología', 'Piel, cabello y uñas', 30),
  ('Ortopedia y Traumatología', 'Huesos, articulaciones y lesiones', 30),
  ('Pediatría', 'Atención de niños y adolescentes', 30),
  ('Oftalmología', 'Salud visual', 30),
  ('Radiología e Imágenes', 'Lectura y toma de estudios diagnósticos', 30)
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), duracion_min = VALUES(duracion_min);

-- Poblamiento: sedes de atención
INSERT INTO sedes (nombre, zona, municipio) VALUES
  ('Sede Principal - Chapinero', 'Chapinero', 'Bogotá D.C.'),
  ('Sede Norte - Calle 127', 'Usaquén', 'Bogotá D.C.'),
  ('Sede Occidente - Salitre', 'Fontibón', 'Bogotá D.C.'),
  ('Sede Sur - Restrepo', 'Antonio Nariño', 'Bogotá D.C.')
ON DUPLICATE KEY UPDATE zona = VALUES(zona), municipio = VALUES(municipio);

-- Poblamiento: médicos FICTICIOS (registro, nombre, especialidad, sede)
INSERT INTO medicos (nombre, registro_medico, especialidad_id, sede_id)
SELECT d.nombre, d.registro, e.id, s.id
FROM (
  SELECT 'Dr. Alejandro Morales' AS nombre, 'RM-10001' AS registro, 'Medicina General' AS especialidad, 'Sede Principal - Chapinero' AS sede
  UNION ALL SELECT 'Dra. Paula Andrea Rojas', 'RM-10002', 'Medicina General', 'Sede Norte - Calle 127'
  UNION ALL SELECT 'Dr. Camilo Herrera', 'RM-10003', 'Medicina General', 'Sede Occidente - Salitre'
  UNION ALL SELECT 'Dra. Natalia Vargas', 'RM-10004', 'Medicina General', 'Sede Sur - Restrepo'
  UNION ALL SELECT 'Dra. Sandra Martínez', 'RM-20001', 'Cardiología', 'Sede Norte - Calle 127'
  UNION ALL SELECT 'Dr. Felipe Castaño', 'RM-20002', 'Cardiología', 'Sede Principal - Chapinero'
  UNION ALL SELECT 'Dra. Lucía Pardo', 'RM-30001', 'Dermatología', 'Sede Principal - Chapinero'
  UNION ALL SELECT 'Dr. Mauricio Gil', 'RM-30002', 'Dermatología', 'Sede Occidente - Salitre'
  UNION ALL SELECT 'Dr. Andrés Restrepo', 'RM-40001', 'Ortopedia y Traumatología', 'Sede Occidente - Salitre'
  UNION ALL SELECT 'Dra. Carolina Mejía', 'RM-40002', 'Ortopedia y Traumatología', 'Sede Sur - Restrepo'
  UNION ALL SELECT 'Dra. Juliana Ortiz', 'RM-50001', 'Pediatría', 'Sede Norte - Calle 127'
  UNION ALL SELECT 'Dr. Sebastián Duarte', 'RM-50002', 'Pediatría', 'Sede Sur - Restrepo'
  UNION ALL SELECT 'Dra. Valentina Ruiz', 'RM-60001', 'Oftalmología', 'Sede Principal - Chapinero'
  UNION ALL SELECT 'Dr. Roberto Silva', 'RM-70001', 'Radiología e Imágenes', 'Sede Occidente - Salitre'
) AS d
INNER JOIN especialidades e ON e.nombre = d.especialidad
INNER JOIN sedes s ON s.nombre = d.sede
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), especialidad_id = VALUES(especialidad_id), sede_id = VALUES(sede_id);

-- Poblamiento: horarios. Los médicos con registro par atienden en la mañana y los impares en la tarde,
-- de lunes a viernes; Medicina General y Pediatría atienden además los sábados en la mañana.
INSERT IGNORE INTO horarios (medico_id, dia_semana, hora_inicio, hora_fin)
SELECT m.id, d.dia,
       IF(CAST(RIGHT(m.registro_medico, 1) AS UNSIGNED) % 2 = 0, '07:00:00', '13:00:00'),
       IF(CAST(RIGHT(m.registro_medico, 1) AS UNSIGNED) % 2 = 0, '12:00:00', '17:00:00')
FROM medicos m
CROSS JOIN (SELECT 1 AS dia UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) AS d;

INSERT IGNORE INTO horarios (medico_id, dia_semana, hora_inicio, hora_fin)
SELECT m.id, 6, '08:00:00', '12:00:00'
FROM medicos m
INNER JOIN especialidades e ON e.id = m.especialidad_id
WHERE e.nombre IN ('Medicina General', 'Pediatría');
