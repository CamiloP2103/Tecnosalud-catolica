-- ========================================================
-- Script de Creación y Poblamiento - db_auth (MySQL 8.0+)
-- Arquitectura: Tecnosalud Católica - Azure Database for MySQL
-- ========================================================

CREATE DATABASE IF NOT EXISTS db_auth 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE db_auth;

-- 1. Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabla de Usuarios y Credenciales
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_doc ENUM('CC', 'TI', 'CE', 'PA') NOT NULL,
  documento VARCHAR(20) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL, -- Almacena el hash bcrypt ($2a$ / $2b$)
  nombre VARCHAR(100) NOT NULL,
  rol_id INT NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  intentos_fallidos INT DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES roles(id),
  CONSTRAINT uq_tipo_documento UNIQUE (tipo_doc, documento)
) ENGINE=InnoDB;

-- 3. Tabla de Logs de Autenticación
CREATE TABLE IF NOT EXISTS bitacora_acceso (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  email_ingresado VARCHAR(120) NOT NULL,
  ip_origen VARCHAR(45) NULL,
  exitoso BOOLEAN NOT NULL,
  motivo_fallo VARCHAR(100) NULL,
  fecha_intento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bitacora_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Poblamiento de Roles
INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES
  (1, 'PACIENTE', 'Usuario afiliado al sistema de salud'),
  (2, 'MEDICO', 'Personal asistencial y clínico'),
  (3, 'ADMIN', 'Administrador técnico de la plataforma');

-- Poblamiento de Usuarios de prueba. Hashes bcrypt reales (cost factor = 10) de estas claves:
--   caenjiro@gmail.com               -> 123456
--   carlos.jimenez@tecnosalud.com.co -> admin2026
--   maria.gomez@clinicaejemplo.com   -> maria2026
--   soporte.tecnosalud@gmail.com     -> soporte123
--   afiliados.bogota@redsalud.com    -> afiliados2026
-- Son claves de DEMOSTRACIÓN: cámbialas (o elimina estos usuarios) en un entorno real.
-- Volver a ejecutar el script restablece estas claves de prueba.
INSERT INTO usuarios (tipo_doc, documento, email, contrasena_hash, nombre, rol_id, activo) VALUES
  ('CC', '72000607', 'caenjiro@gmail.com', '$2a$10$7mu6GqbPZz7jhf8dEFZxUeS/xrjIMSflJUBzZbOX2uOzS3LcZMoK.', 'Carlos Jiménez', 1, TRUE),
  ('CC', '1020304050', 'carlos.jimenez@tecnosalud.com.co', '$2a$10$1MrL0NFs6GMTQUwe6f9KduGSYybU1zdE0i8tpookKC4OL2U5JlK.K', 'Carlos Admin', 3, TRUE),
  ('CE', '52148963', 'maria.gomez@clinicaejemplo.com', '$2a$10$xJ7Q9olRX3tiel8z7DLke.1yuF8LsowoyEwszxV.KLrPW2piFJrb2', 'María Gómez', 2, TRUE),
  ('TI', '80123456', 'soporte.tecnosalud@gmail.com', '$2a$10$CL2/AUijxk3ENThIFo5jA.Z0pBS3pcpRStzK2YishRKMf8KBNjJHa', 'Soporte Técnico', 3, TRUE),
  ('PA', '19456789', 'afiliados.bogota@redsalud.com', '$2a$10$PZzUhXr4CerhuHtymBs7e.Tovq/NeednKzucIRvDsb18l0873bZre', 'Afiliaciones Bogotá', 1, TRUE)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), contrasena_hash = VALUES(contrasena_hash);

-- 4. Tokens de recuperación de contraseña
CREATE TABLE IF NOT EXISTS tokens_recuperacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expira_en DATETIME NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_token_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;
