CREATE DATABASE IF NOT EXISTS lamp_store;
USE lamp_store;

CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image VARCHAR(500),
  price DECIMAL(10,2),
  type VARCHAR(100),
  manufacturer VARCHAR(100),
  diodes VARCHAR(50),
  characteristic1 VARCHAR(100),
  characteristic2 VARCHAR(100),
  brand VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_type ON products(type);
CREATE INDEX idx_manufacturer ON products(manufacturer);
CREATE INDEX idx_price ON products(price);

INSERT INTO products (title, description, image, price, type, manufacturer, diodes, characteristic1, characteristic2, brand) VALUES
('LED Ceiling Pro', 'Сучасна лампа для стелі забезпечує яскраве, рівномірне освітлення при мінімальному енергоспоживанні.', '/images/201.jpg', 149.99, 'LED', 'LampTech', '120 LEDs', 'Energy Saving', 'Modern Design', 'LampTech'),
('Desk Lamp Elite', 'Ідеальна лампа для робочого столу з регульованою яскравістю та сучасним дизайном.', '/images/202.jpg', 79.99, 'LED', 'BrightWorks', '60 LEDs', 'Adjustable Brightness', 'LED Technology', 'BrightWorks'),
('Floor Lamp Modern', 'Висока напольна лампа для загального освітлення приміщення. Елегантний дизайн.', '/images/203.jpg', 199.99, 'LED', 'Luminaire Co', '80 LEDs', 'Tall Design', 'Ambient Lighting', 'Luminaire Co'),
('Smart LED Panel', 'Розумна LED панель з керуванням через додаток та регульованою кольоровою температурою.', '/images/204.jpg', 129.99, 'Smart LED', 'TechLight', '200 LEDs', 'Smart Control', 'Color Adjustable', 'TechLight'),
('Vintage Table Lamp', 'Класична настільна лампа у вінтажному стилі з енергозберігаючою LED технологією.', '/images/205.jpg', 89.99, 'LED', 'Classic Lights', '40 LEDs', 'Vintage Style', 'Energy Efficient', 'Classic Lights'),
('Industrial Pendant', 'Промисловий підвісний світильник з металевим абажуром та яскравим LED освітленням.', '/images/207.jpg', 159.99, 'LED', 'Industrial Glow', '100 LEDs', 'Industrial Style', 'Metal Shade', 'Industrial Glow');

SELECT 'Базу даних успішно створено!' as status;
SELECT COUNT(*) as total_products FROM products;
SELECT * FROM products;