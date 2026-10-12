-- ========================================================
-- Script de creación - db_registro (MySQL 8.0+)
-- Base de datos PROPIA del microservicio de Registro
-- ========================================================

CREATE DATABASE IF NOT EXISTS db_registro
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_registro;

CREATE TABLE IF NOT EXISTS afiliados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  tipo_doc ENUM('CC', 'TI', 'CE', 'PA') NOT NULL,
  documento VARCHAR(20) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  genero ENUM('M', 'F', 'Otro') NOT NULL,
  correo VARCHAR(120) NOT NULL,
  telefono VARCHAR(10) NOT NULL,
  direccion VARCHAR(200) NOT NULL,
  ciudad VARCHAR(80) NOT NULL,
  tipo_afiliacion ENUM('paciente', 'profesional', 'empresa') NOT NULL,
  eps VARCHAR(100) NOT NULL,
  regimen ENUM('contributivo', 'subsidiado', 'especial', 'particular') NOT NULL,
  contacto_emergencia_nombre VARCHAR(120) NOT NULL,
  contacto_emergencia_telefono VARCHAR(10) NOT NULL,
  acepta_tratamiento_datos BOOLEAN NOT NULL,
  fecha_aceptacion_datos TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('PENDIENTE', 'ACTIVO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_afiliado_correo UNIQUE (correo),
  CONSTRAINT uq_afiliado_documento UNIQUE (tipo_doc, documento)
) ENGINE=InnoDB;
