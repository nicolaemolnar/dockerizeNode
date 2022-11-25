-- Creación de base de datos (si no existe)
CREATE DATABASE IF NOT EXISTS cars;
USE cars;

-- Creación de la tabla cars
CREATE TABLE IF NOT EXISTS cars (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  price INT NOT NULL,
  PRIMARY KEY (id)
);

-- Carga inicial de la aplicación
INSERT INTO cars (name, model, price) VALUES
('Audi', 'A4', 30000),
('BMW', 'X5', 50000),
('Mercedes', 'C200', 40000);
