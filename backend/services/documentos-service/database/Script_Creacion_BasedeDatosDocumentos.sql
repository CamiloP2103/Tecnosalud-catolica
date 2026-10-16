-- ========================================================
-- Script de creación - db_documentos (MySQL 8.0+)
-- Base de datos PROPIA del microservicio de Documentos
-- ========================================================
-- Guarda solo los METADATOS de los documentos y la bitácora de descargas.
-- Los archivos se guardan cifrados (AES-256-GCM) en la carpeta storage/ del servicio.
-- Volver a ejecutar el script es seguro: no borra datos.

CREATE DATABASE IF NOT EXISTS db_documentos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_documentos;

CREATE TABLE IF NOT EXISTS documentos (
  id CHAR(36) PRIMARY KEY,
  paciente_doc VARCHAR(20) NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  descripcion VARCHAR(500) NULL,
  nombre_original VARCHAR(255) NOT NULL,
  nombre_guardado VARCHAR(80) NOT NULL UNIQUE,
  extension VARCHAR(10) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  tamano BIGINT UNSIGNED NOT NULL,
  creado_por_doc VARCHAR(20) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_documentos_paciente_fecha (paciente_doc, creado_en)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bitacora_descargas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  documento_id CHAR(36) NOT NULL,
  usuario_doc VARCHAR(20) NOT NULL,
  rol_usuario VARCHAR(50) NOT NULL,
  ip_origen VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  descargado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_descargas_documento_fecha (documento_id, descargado_en),
  INDEX idx_descargas_usuario_fecha (usuario_doc, descargado_en),
  CONSTRAINT fk_descargas_documento
    FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE
) ENGINE=InnoDB;
