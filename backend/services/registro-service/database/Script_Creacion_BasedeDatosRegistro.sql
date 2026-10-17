-- ========================================================
-- Script de creación y poblamiento - db_registro (MySQL 8.0+)
-- Base de datos PROPIA del microservicio de Registro (afiliaciones)
-- ========================================================
-- Catálogos colombianos (tipos de documento, departamentos y municipios con código DANE, EPS,
-- regímenes, tipos de afiliación, géneros y parentescos) y la tabla de afiliados relacionada con
-- todos ellos mediante llaves foráneas: la base no acepta un valor que no exista en su catálogo.
-- Códigos DANE según la división político-administrativa (DIVIPOLA); si se agregan municipios,
-- conviene verificarlos en la fuente oficial del DANE.
-- Volver a ejecutar el script es seguro: actualiza los catálogos y no borra afiliados.

CREATE DATABASE IF NOT EXISTS db_registro
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_registro;

-- ---------- CATÁLOGOS ----------

CREATE TABLE IF NOT EXISTS tipos_documento (
  codigo VARCHAR(3) PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(200) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS generos (
  codigo VARCHAR(5) PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS departamentos (
  codigo CHAR(2) PRIMARY KEY,               -- código DANE del departamento
  nombre VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS municipios (
  codigo CHAR(5) PRIMARY KEY,               -- código DANE del municipio (2 del departamento + 3)
  nombre VARCHAR(80) NOT NULL,
  departamento_codigo CHAR(2) NOT NULL,
  CONSTRAINT fk_municipio_departamento FOREIGN KEY (departamento_codigo) REFERENCES departamentos(codigo),
  CONSTRAINT uq_municipio_nombre UNIQUE (departamento_codigo, nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS regimenes (
  codigo VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(200) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS eps (
  codigo VARCHAR(30) PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  activa BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipos_afiliacion (
  codigo VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS parentescos (
  codigo VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL
) ENGINE=InnoDB;

-- ---------- AFILIADOS ----------

CREATE TABLE IF NOT EXISTS afiliados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  tipo_documento_codigo VARCHAR(3) NOT NULL,
  documento VARCHAR(20) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  genero_codigo VARCHAR(5) NOT NULL,
  correo VARCHAR(120) NOT NULL,
  telefono VARCHAR(10) NOT NULL,
  direccion VARCHAR(200) NOT NULL,
  municipio_codigo CHAR(5) NOT NULL,
  tipo_afiliacion_codigo VARCHAR(20) NOT NULL,
  eps_codigo VARCHAR(30) NOT NULL,
  regimen_codigo VARCHAR(20) NOT NULL,
  contacto_emergencia_nombre VARCHAR(120) NOT NULL,
  contacto_emergencia_telefono VARCHAR(10) NOT NULL,
  contacto_emergencia_parentesco_codigo VARCHAR(20) NULL,
  acepta_tratamiento_datos BOOLEAN NOT NULL,     -- Ley 1581 de 2012 (habeas data)
  fecha_aceptacion_datos TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('PENDIENTE', 'ACTIVO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_afiliado_correo UNIQUE (correo),
  CONSTRAINT uq_afiliado_documento UNIQUE (tipo_documento_codigo, documento),
  CONSTRAINT fk_afiliado_tipo_documento FOREIGN KEY (tipo_documento_codigo) REFERENCES tipos_documento(codigo),
  CONSTRAINT fk_afiliado_genero FOREIGN KEY (genero_codigo) REFERENCES generos(codigo),
  CONSTRAINT fk_afiliado_municipio FOREIGN KEY (municipio_codigo) REFERENCES municipios(codigo),
  CONSTRAINT fk_afiliado_tipo_afiliacion FOREIGN KEY (tipo_afiliacion_codigo) REFERENCES tipos_afiliacion(codigo),
  CONSTRAINT fk_afiliado_eps FOREIGN KEY (eps_codigo) REFERENCES eps(codigo),
  CONSTRAINT fk_afiliado_regimen FOREIGN KEY (regimen_codigo) REFERENCES regimenes(codigo),
  CONSTRAINT fk_afiliado_parentesco FOREIGN KEY (contacto_emergencia_parentesco_codigo) REFERENCES parentescos(codigo),
  INDEX idx_afiliado_estado (estado, creado_en)
) ENGINE=InnoDB;

-- Historial de cambios de estado (quién aprobó o rechazó cada afiliación y cuándo)
CREATE TABLE IF NOT EXISTS historial_estados (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  afiliado_id INT NOT NULL,
  estado_anterior ENUM('PENDIENTE', 'ACTIVO', 'RECHAZADO') NOT NULL,
  estado_nuevo ENUM('PENDIENTE', 'ACTIVO', 'RECHAZADO') NOT NULL,
  cambiado_por VARCHAR(120) NOT NULL,             -- correo del administrador (db_auth.usuarios.email)
  observacion VARCHAR(300) NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_historial_afiliado FOREIGN KEY (afiliado_id) REFERENCES afiliados(id) ON DELETE CASCADE,
  INDEX idx_historial_afiliado (afiliado_id, creado_en)
) ENGINE=InnoDB;

-- ---------- DATOS DE LOS CATÁLOGOS ----------

INSERT INTO tipos_documento (codigo, nombre, descripcion) VALUES
  ('CC', 'Cédula de ciudadanía', 'Colombianos mayores de 18 años'),
  ('TI', 'Tarjeta de identidad', 'Colombianos de 7 a 17 años'),
  ('RC', 'Registro civil de nacimiento', 'Colombianos menores de 7 años'),
  ('CE', 'Cédula de extranjería', 'Extranjeros residentes'),
  ('PA', 'Pasaporte', 'Extranjeros sin cédula de extranjería'),
  ('PPT', 'Permiso por Protección Temporal', 'Migrantes venezolanos con PPT')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion);

INSERT INTO generos (codigo, nombre) VALUES
  ('M', 'Masculino'),
  ('F', 'Femenino'),
  ('Otro', 'Otro / Prefiero no decir')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO departamentos (codigo, nombre) VALUES
  ('05', 'Antioquia'), ('08', 'Atlántico'), ('11', 'Bogotá D.C.'), ('13', 'Bolívar'), ('15', 'Boyacá'),
  ('17', 'Caldas'), ('18', 'Caquetá'), ('19', 'Cauca'), ('20', 'Cesar'), ('23', 'Córdoba'),
  ('25', 'Cundinamarca'), ('27', 'Chocó'), ('41', 'Huila'), ('44', 'La Guajira'), ('47', 'Magdalena'),
  ('50', 'Meta'), ('52', 'Nariño'), ('54', 'Norte de Santander'), ('63', 'Quindío'), ('66', 'Risaralda'),
  ('68', 'Santander'), ('70', 'Sucre'), ('73', 'Tolima'), ('76', 'Valle del Cauca'), ('81', 'Arauca'),
  ('85', 'Casanare'), ('86', 'Putumayo'), ('88', 'Archipiélago de San Andrés, Providencia y Santa Catalina'),
  ('91', 'Amazonas'), ('94', 'Guainía'), ('95', 'Guaviare'), ('97', 'Vaupés'), ('99', 'Vichada')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO municipios (codigo, nombre, departamento_codigo) VALUES
  ('11001', 'Bogotá D.C.', '11'),
  ('25754', 'Soacha', '25'), ('25175', 'Chía', '25'), ('25899', 'Zipaquirá', '25'), ('25269', 'Facatativá', '25'),
  ('25307', 'Girardot', '25'), ('25290', 'Fusagasugá', '25'), ('25473', 'Mosquera', '25'), ('25430', 'Madrid', '25'),
  ('25286', 'Funza', '25'), ('25126', 'Cajicá', '25'), ('25214', 'Cota', '25'), ('25377', 'La Calera', '25'),
  ('25817', 'Tocancipá', '25'), ('25758', 'Sopó', '25'), ('25799', 'Tenjo', '25'), ('25785', 'Tabio', '25'),
  ('05001', 'Medellín', '05'), ('05088', 'Bello', '05'), ('05360', 'Itagüí', '05'), ('05266', 'Envigado', '05'),
  ('05615', 'Rionegro', '05'), ('05045', 'Apartadó', '05'),
  ('76001', 'Cali', '76'), ('76520', 'Palmira', '76'), ('76109', 'Buenaventura', '76'), ('76834', 'Tuluá', '76'),
  ('76147', 'Cartago', '76'), ('76111', 'Guadalajara de Buga', '76'),
  ('08001', 'Barranquilla', '08'), ('08758', 'Soledad', '08'), ('08433', 'Malambo', '08'), ('08638', 'Sabanalarga', '08'),
  ('08573', 'Puerto Colombia', '08'),
  ('68001', 'Bucaramanga', '68'), ('68276', 'Floridablanca', '68'), ('68307', 'Girón', '68'), ('68547', 'Piedecuesta', '68'),
  ('68081', 'Barrancabermeja', '68'),
  ('13001', 'Cartagena de Indias', '13'), ('13430', 'Magangué', '13'), ('13836', 'Turbaco', '13'), ('13052', 'Arjona', '13'),
  ('13244', 'El Carmen de Bolívar', '13'),
  ('66001', 'Pereira', '66'), ('66170', 'Dosquebradas', '66'), ('66682', 'Santa Rosa de Cabal', '66'),
  ('17001', 'Manizales', '17'), ('63001', 'Armenia', '63'),
  ('73001', 'Ibagué', '73'), ('73268', 'Espinal', '73'), ('73449', 'Melgar', '73'),
  ('41001', 'Neiva', '41'), ('41551', 'Pitalito', '41'),
  ('52001', 'Pasto', '52'), ('52356', 'Ipiales', '52'), ('52835', 'Tumaco', '52'),
  ('19001', 'Popayán', '19'), ('19698', 'Santander de Quilichao', '19'),
  ('54001', 'Cúcuta', '54'), ('54498', 'Ocaña', '54'), ('54874', 'Villa del Rosario', '54'), ('54405', 'Los Patios', '54'),
  ('54518', 'Pamplona', '54'),
  ('15001', 'Tunja', '15'), ('15238', 'Duitama', '15'), ('15759', 'Sogamoso', '15'),
  ('47001', 'Santa Marta', '47'), ('20001', 'Valledupar', '20'), ('23001', 'Montería', '23'), ('70001', 'Sincelejo', '70'),
  ('44001', 'Riohacha', '44'), ('27001', 'Quibdó', '27'), ('50001', 'Villavicencio', '50'), ('85001', 'Yopal', '85'),
  ('18001', 'Florencia', '18'), ('81001', 'Arauca', '81'), ('86001', 'Mocoa', '86'), ('88001', 'San Andrés', '88'),
  ('91001', 'Leticia', '91'), ('94001', 'Inírida', '94'), ('95001', 'San José del Guaviare', '95'), ('97001', 'Mitú', '97'),
  ('99001', 'Puerto Carreño', '99')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), departamento_codigo = VALUES(departamento_codigo);

INSERT INTO regimenes (codigo, nombre, descripcion) VALUES
  ('contributivo', 'Contributivo', 'Trabajadores y pensionados que cotizan'),
  ('subsidiado', 'Subsidiado', 'Población sin capacidad de pago, financiada por el Estado'),
  ('especial', 'Especial / Régimen de excepción', 'Fuerzas Militares, Policía, Magisterio, Ecopetrol, universidades públicas'),
  ('particular', 'Particular / Póliza de salud', 'Medicina prepagada o pago directo')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion);

INSERT INTO eps (codigo, nombre) VALUES
  ('NUEVA_EPS', 'Nueva EPS'),
  ('SURA', 'EPS Sura'),
  ('SANITAS', 'EPS Sanitas'),
  ('COMPENSAR', 'Compensar EPS'),
  ('FAMISANAR', 'Famisanar'),
  ('SALUD_TOTAL', 'Salud Total EPS'),
  ('COOSALUD', 'Coosalud EPS'),
  ('MUTUAL_SER', 'Mutual Ser EPS'),
  ('ALIANSALUD', 'Aliansalud EPS'),
  ('CAPITAL_SALUD', 'Capital Salud EPS'),
  ('EMSSANAR', 'Emssanar EPS'),
  ('ASMET_SALUD', 'Asmet Salud EPS'),
  ('SAVIA_SALUD', 'Savia Salud EPS'),
  ('CAJACOPI', 'Cajacopi EPS'),
  ('CAPRESOCA', 'Capresoca EPS'),
  ('COMFENALCO_VALLE', 'Comfenalco Valle EPS'),
  ('DUSAKAWI', 'Dusakawi EPSI'),
  ('MALLAMAS', 'Mallamas EPSI'),
  ('PIJAOS_SALUD', 'Pijaos Salud EPSI'),
  ('REGIMEN_EXCEPCION', 'Régimen de excepción (Fuerzas Militares, Policía, Magisterio, Ecopetrol)'),
  ('NINGUNA', 'Ninguna / Particular')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO tipos_afiliacion (codigo, nombre) VALUES
  ('paciente', 'Paciente / Afiliado general'),
  ('profesional', 'Profesional de la salud'),
  ('empresa', 'Empresa / Convenio institucional')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO parentescos (codigo, nombre) VALUES
  ('madre', 'Madre'), ('padre', 'Padre'), ('conyuge', 'Cónyuge o compañero(a)'), ('hijo', 'Hijo(a)'),
  ('hermano', 'Hermano(a)'), ('abuelo', 'Abuelo(a)'), ('tio', 'Tío(a)'), ('amigo', 'Amigo(a)'), ('otro', 'Otro')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
