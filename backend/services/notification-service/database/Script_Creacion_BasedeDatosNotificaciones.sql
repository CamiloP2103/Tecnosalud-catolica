-- ========================================================
-- Script de creación - db_notificaciones (MySQL 8.0+)
-- Base de datos PROPIA del microservicio de Notificaciones
-- ========================================================
-- Guarda el historial de cada correo que piden los demás microservicios: a quién se envió, qué
-- servicio lo pidió, con qué asunto y si se entregó al servidor SMTP o falló. NO guarda el cuerpo
-- del correo (puede contener enlaces de recuperación o datos clínicos).
-- Volver a ejecutar el script es seguro: no borra datos.

CREATE DATABASE IF NOT EXISTS db_notificaciones
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_notificaciones;

CREATE TABLE IF NOT EXISTS notificaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  destinatario VARCHAR(254) NOT NULL,       -- correo del usuario (en db_auth: usuarios.email)
  asunto VARCHAR(200) NOT NULL,
  servicio_origen VARCHAR(40) NOT NULL,      -- auth-service, registro-service, farmacias-service...
  estado ENUM('ENVIADA', 'FALLIDA') NOT NULL,
  message_id VARCHAR(255) NULL,              -- identificador que devuelve el servidor SMTP
  error VARCHAR(255) NULL,                   -- motivo resumido si falló
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notificacion_destinatario (destinatario, creado_en),
  INDEX idx_notificacion_origen (servicio_origen, creado_en),
  INDEX idx_notificacion_estado (estado, creado_en)
) ENGINE=InnoDB;
