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
  id BIGINT AUTO_INCREMENT PRIMARY KEY,usuarios
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

-- Poblamiento de Usuarios con contraseñas encriptadas con bcrypt (cost factor = 10)
-- 1. '123456'        -> $2a$10$wK1bQv22i6.dK.8y2j69eODJbNqG7m.K7gK4u2g7i2O7M7y2q69eO
-- 2. 'admin2026'     -> $2a$10$4B9.x5u5.5lY.5q5.5q5.u8mP.P5q5.5q5.5q5.5q5.5q5.5q5.5
-- 3. 'maria2026'     -> $2a$10$7C9.x5u5.5lY.5q5.5q5.u8mP.P5q5.5q5.5q5.5q5.5q5.5q5.6
INSERT INTO usuarios (tipo_doc, documento, email, contrasena_hash, nombre, rol_id, activo) VALUES
  ('CC', '72000607', 'caenjiro@gmail.com', '$2a$10$1Yj4MflVf0XF6xT394eQ/eL9o6QpZ0i8Nq0.qK1k7k2pM4y7l2a1S', 'Carlos Jiménez', 1, TRUE),
  ('CC', '1020304050', 'carlos.jimenez@tecnosalud.com.co', '$2a$10$9GvG3qY0Qp/eL9o6QpZ0i8Nq0.qK1k7k2pM4y7l2a1S1Yj4MflVf0', 'Carlos Admin', 3, TRUE),
  ('CE', '52148963', 'maria.gomez@clinicaejemplo.com', '$2a$10$k2pM4y7l2a1S1Yj4MflVf0XF6xT394eQ/eL9o6QpZ0i8Nq0.qK1k7', 'María Gómez', 2, TRUE),
  ('TI', '80123456', 'soporte.tecnosalud@gmail.com', '$2a$10$L9o6QpZ0i8Nq0.qK1k7k2pM4y7l2a1S1Yj4MflVf0XF6xT394eQ/e', 'Soporte Técnico', 3, TRUE),
  ('PA', '19456789', 'afiliados.bogota@redsalud.com', '$2a$10$qK1k7k2pM4y7l2a1S1Yj4MflVf0XF6xT394eQ/eL9o6QpZ0i8Nq0.', 'Afiliaciones Bogotá', 1, TRUE)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

select * from usuarios 


USE db_auth;

CREATE TABLE IF NOT EXISTS tokens_recuperacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expira_en DATETIME NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_token_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

select * from db_auth.tokens_recuperacion