-- ========================================================
-- Script de creación y poblamiento - db_farmacias (MySQL 8.0+)
-- Base de datos PROPIA del microservicio de Farmacias
-- ========================================================
-- Datos de referencia:
--   * 100 medicamentos de uso común en Colombia. "requiere_formula" indica venta bajo fórmula médica;
--     "control_especial" marca medicamentos de control especial (Fondo Nacional de Estupefacientes),
--     que no se pueden solicitar en línea. Los precios son valores de referencia APROXIMADOS en COP,
--     solo demostrativos.
--   * 8 farmacias reales de Bogotá y municipios cercanos (direcciones y horarios tomados de los
--     directorios públicos de Farmatodo y Colsubsidio, consultados en octubre de 2026; pueden cambiar).
--   * El inventario es FICTICIO: se genera de forma determinística para la demostración.
-- Volver a ejecutar el script es seguro: no duplica datos ni borra solicitudes.

CREATE DATABASE IF NOT EXISTS db_farmacias
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_farmacias;

-- 1. Catálogo de medicamentos
CREATE TABLE IF NOT EXISTS medicamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  concentracion VARCHAR(40) NOT NULL,
  forma_farmaceutica VARCHAR(40) NOT NULL,
  presentacion VARCHAR(60) NOT NULL,
  categoria VARCHAR(60) NOT NULL,
  requiere_formula BOOLEAN NOT NULL,
  control_especial BOOLEAN NOT NULL DEFAULT FALSE,
  precio_referencia DECIMAL(10,2) NOT NULL,
  descripcion VARCHAR(200) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_medicamento_nombre (nombre),
  INDEX idx_medicamento_categoria (categoria)
) ENGINE=InnoDB;

-- 2. Farmacias (sedes) donde el usuario puede reclamar
CREATE TABLE IF NOT EXISTS farmacias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  cadena VARCHAR(60) NOT NULL,
  direccion VARCHAR(160) NOT NULL,
  localidad VARCHAR(60) NULL,
  municipio VARCHAR(60) NOT NULL,
  horario VARCHAR(120) NOT NULL,
  abierta_24h BOOLEAN NOT NULL DEFAULT FALSE,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Inventario: existencias y precio de cada medicamento en cada farmacia
CREATE TABLE IF NOT EXISTS inventario (
  farmacia_id INT NOT NULL,
  medicamento_id INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 0,
  precio DECIMAL(10,2) NOT NULL,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (farmacia_id, medicamento_id),
  CONSTRAINT fk_inventario_farmacia FOREIGN KEY (farmacia_id) REFERENCES farmacias(id),
  CONSTRAINT fk_inventario_medicamento FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id),
  CONSTRAINT chk_inventario_cantidad CHECK (cantidad >= 0)
) ENGINE=InnoDB;

-- 4. Solicitudes de medicamentos hechas por los usuarios
CREATE TABLE IF NOT EXISTS solicitudes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,              -- id del usuario en db_auth (viene en el JWT)
  usuario_email VARCHAR(120) NOT NULL,
  farmacia_id INT NOT NULL,
  estado ENUM('PENDIENTE', 'LISTA', 'ENTREGADA', 'CANCELADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  formula_numero VARCHAR(40) NULL,
  formula_medico VARCHAR(120) NULL,
  formula_registro_medico VARCHAR(40) NULL,
  formula_fecha DATE NULL,
  observaciones VARCHAR(300) NULL,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_solicitud_farmacia FOREIGN KEY (farmacia_id) REFERENCES farmacias(id),
  INDEX idx_solicitud_usuario (usuario_id)
) ENGINE=InnoDB;

-- 5. Detalle de cada solicitud
CREATE TABLE IF NOT EXISTS solicitud_items (
  solicitud_id INT NOT NULL,
  medicamento_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (solicitud_id, medicamento_id),
  CONSTRAINT fk_item_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_medicamento FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id),
  CONSTRAINT chk_item_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB;

-- 6. Historial de reabastecimientos semanales (solo los lunes, uno por semana ISO)
CREATE TABLE IF NOT EXISTS reabastecimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  semana CHAR(8) NOT NULL UNIQUE,            -- semana ISO, ej. 2026-W43: impide reabastecer dos veces
  fecha DATE NOT NULL,                        -- lunes en que se hizo (hora de Bogotá)
  origen ENUM('AUTOMATICO', 'MANUAL') NOT NULL,
  objetivo INT NOT NULL,                      -- unidades a las que se rellena cada producto
  filas_actualizadas INT NOT NULL DEFAULT 0,
  unidades_agregadas INT NOT NULL DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Poblamiento: medicamentos (codigo, nombre, concentracion, forma, presentacion, categoria,
-- requiere_formula, control_especial, precio_referencia, descripcion)
INSERT INTO medicamentos
  (codigo, nombre, concentracion, forma_farmaceutica, presentacion, categoria,
   requiere_formula, control_especial, precio_referencia, descripcion)
VALUES
  ('MED-001', 'Acetaminofén', '500 mg', 'Tableta', 'Caja x 20 tabletas', 'Analgésicos y antiinflamatorios', FALSE, FALSE, 3500, 'Dolor leve a moderado y fiebre'),
  ('MED-002', 'Acetaminofén', '150 mg/5 mL', 'Jarabe', 'Frasco x 60 mL', 'Analgésicos y antiinflamatorios', FALSE, FALSE, 6500, 'Fiebre y dolor en niños'),
  ('MED-003', 'Ibuprofeno', '400 mg', 'Tableta', 'Caja x 10 tabletas', 'Analgésicos y antiinflamatorios', FALSE, FALSE, 4500, 'Dolor, inflamación y fiebre'),
  ('MED-004', 'Ibuprofeno', '100 mg/5 mL', 'Suspensión oral', 'Frasco x 120 mL', 'Analgésicos y antiinflamatorios', FALSE, FALSE, 9000, 'Fiebre y dolor en niños'),
  ('MED-005', 'Naproxeno', '250 mg', 'Tableta', 'Caja x 10 tabletas', 'Analgésicos y antiinflamatorios', FALSE, FALSE, 5500, 'Dolor e inflamación leve'),
  ('MED-006', 'Ácido acetilsalicílico', '100 mg', 'Tableta', 'Caja x 30 tabletas', 'Analgésicos y antiinflamatorios', FALSE, FALSE, 4000, 'Antiagregante plaquetario (según indicación médica)'),
  ('MED-007', 'Diclofenaco', '1 %', 'Gel tópico', 'Tubo x 50 g', 'Analgésicos y antiinflamatorios', FALSE, FALSE, 9500, 'Dolor muscular y articular localizado'),
  ('MED-008', 'Butilbromuro de hioscina', '10 mg', 'Tableta', 'Caja x 20 tabletas', 'Analgésicos y antiinflamatorios', FALSE, FALSE, 9000, 'Cólico y espasmo abdominal'),
  ('MED-009', 'Diclofenaco', '50 mg', 'Tableta', 'Caja x 30 tabletas', 'Analgésicos y antiinflamatorios', TRUE, FALSE, 6000, 'Dolor e inflamación'),
  ('MED-010', 'Naproxeno', '500 mg', 'Tableta', 'Caja x 10 tabletas', 'Analgésicos y antiinflamatorios', TRUE, FALSE, 7500, 'Dolor e inflamación moderada'),
  ('MED-011', 'Meloxicam', '15 mg', 'Tableta', 'Caja x 10 tabletas', 'Analgésicos y antiinflamatorios', TRUE, FALSE, 8000, 'Artritis y artrosis'),
  ('MED-012', 'Ketorolaco', '10 mg', 'Tableta', 'Caja x 10 tabletas', 'Analgésicos y antiinflamatorios', TRUE, FALSE, 9000, 'Dolor agudo moderado a severo'),
  ('MED-013', 'Metamizol (dipirona)', '500 mg', 'Tableta', 'Caja x 10 tabletas', 'Analgésicos y antiinflamatorios', TRUE, FALSE, 5000, 'Dolor y fiebre'),
  ('MED-014', 'Ciclobenzaprina', '10 mg', 'Tableta', 'Caja x 30 tabletas', 'Analgésicos y antiinflamatorios', TRUE, FALSE, 12000, 'Espasmo muscular'),
  ('MED-015', 'Colchicina', '0.5 mg', 'Tableta', 'Caja x 40 tabletas', 'Analgésicos y antiinflamatorios', TRUE, FALSE, 15000, 'Crisis de gota'),
  ('MED-016', 'Alopurinol', '100 mg', 'Tableta', 'Caja x 30 tabletas', 'Analgésicos y antiinflamatorios', TRUE, FALSE, 7000, 'Ácido úrico elevado y gota'),
  ('MED-017', 'Acetaminofén + codeína', '325 mg / 30 mg', 'Tableta', 'Caja x 10 tabletas', 'Analgésicos y antiinflamatorios', TRUE, TRUE, 15000, 'Dolor moderado a severo'),
  ('MED-018', 'Amoxicilina', '500 mg', 'Cápsula', 'Caja x 50 cápsulas', 'Antibióticos', TRUE, FALSE, 12000, 'Infecciones bacterianas'),
  ('MED-019', 'Amoxicilina', '250 mg/5 mL', 'Suspensión oral', 'Frasco x 100 mL', 'Antibióticos', TRUE, FALSE, 9000, 'Infecciones bacterianas en niños'),
  ('MED-020', 'Amoxicilina + ácido clavulánico', '875 mg / 125 mg', 'Tableta', 'Caja x 14 tabletas', 'Antibióticos', TRUE, FALSE, 35000, 'Infecciones bacterianas resistentes'),
  ('MED-021', 'Azitromicina', '500 mg', 'Tableta', 'Caja x 3 tabletas', 'Antibióticos', TRUE, FALSE, 12000, 'Infecciones respiratorias y de piel'),
  ('MED-022', 'Cefalexina', '500 mg', 'Cápsula', 'Caja x 20 cápsulas', 'Antibióticos', TRUE, FALSE, 14000, 'Infecciones de piel y vías urinarias'),
  ('MED-023', 'Ciprofloxacina', '500 mg', 'Tableta', 'Caja x 10 tabletas', 'Antibióticos', TRUE, FALSE, 9000, 'Infecciones urinarias y gastrointestinales'),
  ('MED-024', 'Claritromicina', '500 mg', 'Tableta', 'Caja x 10 tabletas', 'Antibióticos', TRUE, FALSE, 28000, 'Infecciones respiratorias'),
  ('MED-025', 'Doxiciclina', '100 mg', 'Cápsula', 'Caja x 10 cápsulas', 'Antibióticos', TRUE, FALSE, 9000, 'Infecciones bacterianas y acné'),
  ('MED-026', 'Nitrofurantoína', '100 mg', 'Cápsula', 'Caja x 40 cápsulas', 'Antibióticos', TRUE, FALSE, 18000, 'Infección urinaria'),
  ('MED-027', 'Trimetoprim + sulfametoxazol', '160 mg / 800 mg', 'Tableta', 'Caja x 10 tabletas', 'Antibióticos', TRUE, FALSE, 6000, 'Infecciones urinarias y respiratorias'),
  ('MED-028', 'Metronidazol', '500 mg', 'Tableta', 'Caja x 10 tabletas', 'Antibióticos', TRUE, FALSE, 5000, 'Infecciones por anaerobios y parásitos'),
  ('MED-029', 'Clindamicina', '300 mg', 'Cápsula', 'Caja x 16 cápsulas', 'Antibióticos', TRUE, FALSE, 22000, 'Infecciones de piel y dentales'),
  ('MED-030', 'Loratadina', '10 mg', 'Tableta', 'Caja x 10 tabletas', 'Antialérgicos', FALSE, FALSE, 3500, 'Rinitis alérgica y urticaria'),
  ('MED-031', 'Cetirizina', '10 mg', 'Tableta', 'Caja x 10 tabletas', 'Antialérgicos', FALSE, FALSE, 4000, 'Rinitis alérgica y urticaria'),
  ('MED-032', 'Clorfeniramina', '4 mg', 'Tableta', 'Caja x 20 tabletas', 'Antialérgicos', FALSE, FALSE, 3000, 'Síntomas de alergia'),
  ('MED-033', 'Hidroxizina', '25 mg', 'Tableta', 'Caja x 30 tabletas', 'Antialérgicos', TRUE, FALSE, 12000, 'Prurito y ansiedad'),
  ('MED-034', 'Omeprazol', '20 mg', 'Cápsula', 'Caja x 14 cápsulas', 'Gastrointestinales', FALSE, FALSE, 6000, 'Acidez y reflujo'),
  ('MED-035', 'Hidróxido de aluminio + magnesio + simeticona', '—', 'Suspensión oral', 'Frasco x 360 mL', 'Gastrointestinales', FALSE, FALSE, 14000, 'Acidez y gases'),
  ('MED-036', 'Simeticona', '80 mg', 'Tableta masticable', 'Caja x 20 tabletas', 'Gastrointestinales', FALSE, FALSE, 8000, 'Gases y distensión abdominal'),
  ('MED-037', 'Loperamida', '2 mg', 'Tableta', 'Caja x 6 tabletas', 'Gastrointestinales', FALSE, FALSE, 4500, 'Diarrea aguda'),
  ('MED-038', 'Sales de rehidratación oral', '—', 'Polvo para solución', 'Caja x 10 sobres', 'Gastrointestinales', FALSE, FALSE, 9000, 'Prevención de deshidratación'),
  ('MED-039', 'Bisacodilo', '5 mg', 'Tableta', 'Caja x 10 tabletas', 'Gastrointestinales', FALSE, FALSE, 5000, 'Estreñimiento ocasional'),
  ('MED-040', 'Lactulosa', '65 %', 'Jarabe', 'Frasco x 200 mL', 'Gastrointestinales', FALSE, FALSE, 18000, 'Estreñimiento'),
  ('MED-041', 'Esomeprazol', '40 mg', 'Tableta', 'Caja x 14 tabletas', 'Gastrointestinales', TRUE, FALSE, 28000, 'Reflujo y úlcera gástrica'),
  ('MED-042', 'Pantoprazol', '40 mg', 'Tableta', 'Caja x 15 tabletas', 'Gastrointestinales', TRUE, FALSE, 18000, 'Reflujo y protección gástrica'),
  ('MED-043', 'Metoclopramida', '10 mg', 'Tableta', 'Caja x 20 tabletas', 'Gastrointestinales', TRUE, FALSE, 4000, 'Náuseas y vómito'),
  ('MED-044', 'Ondansetrón', '8 mg', 'Tableta', 'Caja x 10 tabletas', 'Gastrointestinales', TRUE, FALSE, 15000, 'Náuseas y vómito severos'),
  ('MED-045', 'Losartán', '50 mg', 'Tableta', 'Caja x 30 tabletas', 'Cardiovasculares', TRUE, FALSE, 6000, 'Hipertensión arterial'),
  ('MED-046', 'Enalapril', '20 mg', 'Tableta', 'Caja x 30 tabletas', 'Cardiovasculares', TRUE, FALSE, 5000, 'Hipertensión e insuficiencia cardíaca'),
  ('MED-047', 'Amlodipino', '5 mg', 'Tableta', 'Caja x 30 tabletas', 'Cardiovasculares', TRUE, FALSE, 5500, 'Hipertensión y angina'),
  ('MED-048', 'Hidroclorotiazida', '25 mg', 'Tableta', 'Caja x 30 tabletas', 'Cardiovasculares', TRUE, FALSE, 4000, 'Hipertensión y edema'),
  ('MED-049', 'Metoprolol tartrato', '50 mg', 'Tableta', 'Caja x 30 tabletas', 'Cardiovasculares', TRUE, FALSE, 6000, 'Hipertensión y arritmias'),
  ('MED-050', 'Carvedilol', '12.5 mg', 'Tableta', 'Caja x 30 tabletas', 'Cardiovasculares', TRUE, FALSE, 9000, 'Insuficiencia cardíaca e hipertensión'),
  ('MED-051', 'Furosemida', '40 mg', 'Tableta', 'Caja x 20 tabletas', 'Cardiovasculares', TRUE, FALSE, 4000, 'Edema y retención de líquidos'),
  ('MED-052', 'Espironolactona', '25 mg', 'Tableta', 'Caja x 30 tabletas', 'Cardiovasculares', TRUE, FALSE, 9000, 'Insuficiencia cardíaca y edema'),
  ('MED-053', 'Atorvastatina', '20 mg', 'Tableta', 'Caja x 30 tabletas', 'Cardiovasculares', TRUE, FALSE, 9000, 'Colesterol alto'),
  ('MED-054', 'Rosuvastatina', '10 mg', 'Tableta', 'Caja x 30 tabletas', 'Cardiovasculares', TRUE, FALSE, 15000, 'Colesterol alto'),
  ('MED-055', 'Clopidogrel', '75 mg', 'Tableta', 'Caja x 14 tabletas', 'Cardiovasculares', TRUE, FALSE, 12000, 'Prevención de trombosis'),
  ('MED-056', 'Warfarina', '5 mg', 'Tableta', 'Caja x 30 tabletas', 'Cardiovasculares', TRUE, FALSE, 15000, 'Anticoagulación'),
  ('MED-057', 'Metformina', '850 mg', 'Tableta', 'Caja x 30 tabletas', 'Diabetes y endocrinología', TRUE, FALSE, 5000, 'Diabetes tipo 2'),
  ('MED-058', 'Glibenclamida', '5 mg', 'Tableta', 'Caja x 30 tabletas', 'Diabetes y endocrinología', TRUE, FALSE, 4000, 'Diabetes tipo 2'),
  ('MED-059', 'Insulina NPH', '100 UI/mL', 'Suspensión inyectable', 'Vial x 10 mL', 'Diabetes y endocrinología', TRUE, FALSE, 35000, 'Diabetes'),
  ('MED-060', 'Insulina glargina', '100 UI/mL', 'Solución inyectable', 'Lapicero prellenado x 3 mL', 'Diabetes y endocrinología', TRUE, FALSE, 65000, 'Diabetes'),
  ('MED-061', 'Levotiroxina', '50 mcg', 'Tableta', 'Caja x 30 tabletas', 'Diabetes y endocrinología', TRUE, FALSE, 12000, 'Hipotiroidismo'),
  ('MED-062', 'Prednisolona', '5 mg', 'Tableta', 'Caja x 20 tabletas', 'Diabetes y endocrinología', TRUE, FALSE, 6000, 'Inflamación y alergias severas'),
  ('MED-063', 'Salbutamol', '100 mcg/dosis', 'Inhalador', 'Inhalador x 200 dosis', 'Respiratorios', TRUE, FALSE, 15000, 'Asma y broncoespasmo'),
  ('MED-064', 'Beclometasona', '250 mcg/dosis', 'Inhalador', 'Inhalador x 200 dosis', 'Respiratorios', TRUE, FALSE, 35000, 'Control del asma'),
  ('MED-065', 'Montelukast', '10 mg', 'Tableta', 'Caja x 10 tabletas', 'Respiratorios', TRUE, FALSE, 18000, 'Asma y rinitis alérgica'),
  ('MED-066', 'Ambroxol', '30 mg/5 mL', 'Jarabe', 'Frasco x 120 mL', 'Respiratorios', FALSE, FALSE, 9000, 'Tos con flema'),
  ('MED-067', 'Dextrometorfano', '15 mg/5 mL', 'Jarabe', 'Frasco x 120 mL', 'Respiratorios', FALSE, FALSE, 12000, 'Tos seca'),
  ('MED-068', 'Acetaminofén + fenilefrina + clorfeniramina', '500 mg / 5 mg / 2 mg', 'Tableta', 'Caja x 12 tabletas', 'Respiratorios', FALSE, FALSE, 9000, 'Síntomas de gripa'),
  ('MED-069', 'Cloruro de sodio', '0.9 %', 'Solución nasal', 'Frasco x 30 mL', 'Respiratorios', FALSE, FALSE, 8000, 'Lavado y descongestión nasal'),
  ('MED-070', 'Oximetazolina', '0.05 %', 'Gotas nasales', 'Frasco x 15 mL', 'Respiratorios', FALSE, FALSE, 12000, 'Congestión nasal'),
  ('MED-071', 'Sertralina', '50 mg', 'Tableta', 'Caja x 30 tabletas', 'Salud mental y neurología', TRUE, FALSE, 12000, 'Depresión y ansiedad'),
  ('MED-072', 'Fluoxetina', '20 mg', 'Cápsula', 'Caja x 30 cápsulas', 'Salud mental y neurología', TRUE, FALSE, 7000, 'Depresión'),
  ('MED-073', 'Escitalopram', '10 mg', 'Tableta', 'Caja x 30 tabletas', 'Salud mental y neurología', TRUE, FALSE, 25000, 'Depresión y ansiedad'),
  ('MED-074', 'Amitriptilina', '25 mg', 'Tableta', 'Caja x 30 tabletas', 'Salud mental y neurología', TRUE, FALSE, 6000, 'Depresión y dolor neuropático'),
  ('MED-075', 'Quetiapina', '25 mg', 'Tableta', 'Caja x 30 tabletas', 'Salud mental y neurología', TRUE, FALSE, 15000, 'Trastornos psiquiátricos'),
  ('MED-076', 'Ácido valproico', '250 mg', 'Cápsula', 'Caja x 50 cápsulas', 'Salud mental y neurología', TRUE, FALSE, 18000, 'Epilepsia y trastorno bipolar'),
  ('MED-077', 'Carbamazepina', '200 mg', 'Tableta', 'Caja x 30 tabletas', 'Salud mental y neurología', TRUE, FALSE, 9000, 'Epilepsia y neuralgia'),
  ('MED-078', 'Gabapentina', '300 mg', 'Cápsula', 'Caja x 30 cápsulas', 'Salud mental y neurología', TRUE, FALSE, 12000, 'Dolor neuropático y epilepsia'),
  ('MED-079', 'Clonazepam', '2 mg', 'Tableta', 'Caja x 30 tabletas', 'Salud mental y neurología', TRUE, TRUE, 9000, 'Trastornos de ansiedad y convulsiones'),
  ('MED-080', 'Alprazolam', '0.5 mg', 'Tableta', 'Caja x 30 tabletas', 'Salud mental y neurología', TRUE, TRUE, 12000, 'Trastornos de ansiedad'),
  ('MED-081', 'Metilfenidato', '10 mg', 'Tableta', 'Caja x 30 tabletas', 'Salud mental y neurología', TRUE, TRUE, 45000, 'Trastorno por déficit de atención'),
  ('MED-082', 'Clotrimazol', '1 %', 'Crema', 'Tubo x 20 g', 'Dermatológicos', FALSE, FALSE, 6000, 'Hongos en la piel'),
  ('MED-083', 'Aciclovir', '5 %', 'Crema', 'Tubo x 5 g', 'Dermatológicos', FALSE, FALSE, 9000, 'Herpes labial'),
  ('MED-084', 'Betametasona', '0.05 %', 'Crema', 'Tubo x 20 g', 'Dermatológicos', TRUE, FALSE, 9000, 'Dermatitis e inflamación de la piel'),
  ('MED-085', 'Mupirocina', '2 %', 'Ungüento', 'Tubo x 15 g', 'Dermatológicos', TRUE, FALSE, 22000, 'Infecciones bacterianas de la piel'),
  ('MED-086', 'Ácido fólico', '1 mg', 'Tableta', 'Caja x 30 tabletas', 'Vitaminas y suplementos', FALSE, FALSE, 4000, 'Suplemento en embarazo y anemia'),
  ('MED-087', 'Sulfato ferroso', '300 mg', 'Tableta', 'Caja x 30 tabletas', 'Vitaminas y suplementos', FALSE, FALSE, 4500, 'Anemia por deficiencia de hierro'),
  ('MED-088', 'Carbonato de calcio + vitamina D3', '600 mg / 400 UI', 'Tableta', 'Caja x 30 tabletas', 'Vitaminas y suplementos', FALSE, FALSE, 15000, 'Salud ósea'),
  ('MED-089', 'Vitamina C', '500 mg', 'Tableta masticable', 'Caja x 30 tabletas', 'Vitaminas y suplementos', FALSE, FALSE, 9000, 'Suplemento vitamínico'),
  ('MED-090', 'Complejo B', '—', 'Tableta', 'Caja x 30 tabletas', 'Vitaminas y suplementos', FALSE, FALSE, 8000, 'Suplemento vitamínico'),
  ('MED-091', 'Albendazol', '400 mg', 'Tableta', 'Caja x 1 tableta', 'Antiparasitarios y antimicóticos', FALSE, FALSE, 3000, 'Parásitos intestinales'),
  ('MED-092', 'Mebendazol', '100 mg', 'Tableta', 'Caja x 6 tabletas', 'Antiparasitarios y antimicóticos', FALSE, FALSE, 3000, 'Parásitos intestinales'),
  ('MED-093', 'Fluconazol', '150 mg', 'Cápsula', 'Caja x 1 cápsula', 'Antiparasitarios y antimicóticos', TRUE, FALSE, 6000, 'Candidiasis'),
  ('MED-094', 'Ivermectina', '6 mg', 'Tableta', 'Caja x 2 tabletas', 'Antiparasitarios y antimicóticos', TRUE, FALSE, 5000, 'Parásitos y escabiosis'),
  ('MED-095', 'Lágrimas artificiales (hipromelosa)', '0.3 %', 'Gotas oftálmicas', 'Frasco x 15 mL', 'Oftálmicos', FALSE, FALSE, 15000, 'Ojo seco'),
  ('MED-096', 'Tobramicina', '0.3 %', 'Gotas oftálmicas', 'Frasco x 5 mL', 'Oftálmicos', TRUE, FALSE, 18000, 'Conjuntivitis bacteriana'),
  ('MED-097', 'Timolol', '0.5 %', 'Gotas oftálmicas', 'Frasco x 5 mL', 'Oftálmicos', TRUE, FALSE, 14000, 'Glaucoma'),
  ('MED-098', 'Tamsulosina', '0.4 mg', 'Cápsula', 'Caja x 30 cápsulas', 'Urología y salud hormonal', TRUE, FALSE, 30000, 'Hiperplasia prostática'),
  ('MED-099', 'Sildenafil', '50 mg', 'Tableta', 'Caja x 4 tabletas', 'Urología y salud hormonal', TRUE, FALSE, 15000, 'Disfunción eréctil'),
  ('MED-100', 'Levonorgestrel + etinilestradiol', '0.15 mg / 0.03 mg', 'Tableta', 'Caja x 21 tabletas', 'Urología y salud hormonal', TRUE, FALSE, 15000, 'Anticoncepción hormonal')
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre), concentracion = VALUES(concentracion),
  forma_farmaceutica = VALUES(forma_farmaceutica), presentacion = VALUES(presentacion),
  categoria = VALUES(categoria), requiere_formula = VALUES(requiere_formula),
  control_especial = VALUES(control_especial), precio_referencia = VALUES(precio_referencia),
  descripcion = VALUES(descripcion);

-- Poblamiento: farmacias (codigo, nombre, cadena, direccion, localidad, municipio, horario, abierta_24h)
INSERT INTO farmacias (codigo, nombre, cadena, direccion, localidad, municipio, horario, abierta_24h)
VALUES
  ('FAR-01', 'Farmatodo Parque 93', 'Farmatodo', 'Calle 93A # 12-73 Local 5', 'Chapinero', 'Bogotá D.C.', '24 horas', TRUE),
  ('FAR-02', 'Farmatodo Salitre 2', 'Farmatodo', 'Carrera 68B # 24A-30', 'Fontibón', 'Bogotá D.C.', '24 horas', TRUE),
  ('FAR-03', 'Droguería Colsubsidio Teusaquillo', 'Colsubsidio', 'Avenida Caracas # 39-71', 'Teusaquillo', 'Bogotá D.C.', 'Lunes a viernes 7:00-19:00; sábados 7:00-17:00', FALSE),
  ('FAR-04', 'Droguería Colsubsidio Kennedy', 'Colsubsidio', 'Carrera 77 # 26-19 Sur', 'Kennedy', 'Bogotá D.C.', 'Lunes a viernes 7:00-19:00; sábados 7:00-17:00', FALSE),
  ('FAR-05', 'Droguería Colsubsidio Toberín', 'Colsubsidio', 'Carrera 21 # 161A-19', 'Usaquén', 'Bogotá D.C.', 'Lunes a viernes 7:00-19:00; sábados 7:00-17:00', FALSE),
  ('FAR-06', 'Farmatodo Chía', 'Farmatodo', 'Km 2 vía Chía-Cajicá', NULL, 'Chía', '24 horas', TRUE),
  ('FAR-07', 'Farmatodo Cajicá', 'Farmatodo', 'Km 1,4 variante Cajicá-Zipaquirá, vereda Calahorra', NULL, 'Cajicá', '24 horas', TRUE),
  ('FAR-08', 'Farmatodo Antares', 'Farmatodo', 'Carrera 7 # 30B-139', NULL, 'Soacha', 'Lunes a sábado 8:00-21:00; domingos y festivos 9:00-20:00', FALSE)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre), cadena = VALUES(cadena), direccion = VALUES(direccion),
  localidad = VALUES(localidad), municipio = VALUES(municipio), horario = VALUES(horario),
  abierta_24h = VALUES(abierta_24h);

-- Poblamiento: inventario ficticio y determinístico.
-- Cada farmacia maneja ~86 % del catálogo; algunas existencias quedan en 0 (agotado) y el precio
-- varía entre -8 % y +6 % del precio de referencia. INSERT IGNORE conserva las existencias actuales
-- si el script se vuelve a ejecutar.
INSERT IGNORE INTO inventario (farmacia_id, medicamento_id, cantidad, precio)
SELECT
  f.id,
  m.id,
  (f.id * 37 + m.id * 11) % 60,
  ROUND(m.precio_referencia * (0.92 + ((f.id * 3 + m.id) % 15) / 100), -2)
FROM farmacias f
CROSS JOIN medicamentos m
WHERE (f.id + m.id) % 7 <> 0;
