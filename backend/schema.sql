-- Smart Parking Management System - Database Schema
-- Database: SISIII2026_[student_number]
-- Collation: utf8_unicode_ci

CREATE TABLE IF NOT EXISTS user (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  user_type ENUM('driver','student','subscriber','employee','admin') NOT NULL DEFAULT 'driver',
  status ENUM('active','inactive','banned') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_email (email),
  INDEX idx_user_type (user_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS parking_lot (
  lot_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200) NOT NULL,
  total_capacity INT NOT NULL,
  opening_hours VARCHAR(100),
  zone VARCHAR(20) NOT NULL,
  status ENUM('active','inactive','maintenance') NOT NULL DEFAULT 'active',
  INDEX idx_lot_zone (zone),
  INDEX idx_lot_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS parking_space (
  space_id INT AUTO_INCREMENT PRIMARY KEY,
  lot_id INT NOT NULL,
  space_number VARCHAR(20) NOT NULL,
  status ENUM('free','occupied','reserved','unavailable','maintenance') NOT NULL DEFAULT 'free',
  space_type ENUM('standard','compact','accessible','ev_charging') NOT NULL DEFAULT 'standard',
  FOREIGN KEY (lot_id) REFERENCES parking_lot(lot_id) ON DELETE CASCADE,
  INDEX idx_parking_space_lot (lot_id),
  INDEX idx_parking_space_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS pricing_rule (
  rule_id INT AUTO_INCREMENT PRIMARY KEY,
  lot_id INT NOT NULL,
  user_type VARCHAR(20),
  rate_per_hour DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  peak_start TIME,
  peak_end TIME,
  peak_rate DECIMAL(6,2),
  FOREIGN KEY (lot_id) REFERENCES parking_lot(lot_id) ON DELETE CASCADE,
  INDEX idx_pricing_lot (lot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS reservation (
  reservation_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  space_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('pending','active','completed','cancelled','expired') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id),
  FOREIGN KEY (space_id) REFERENCES parking_space(space_id),
  INDEX idx_reservation_user (user_id),
  INDEX idx_reservation_space (space_id),
  INDEX idx_reservation_status (status),
  CONSTRAINT chk_end_after_start CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS payment (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reservation_id INT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_type ENUM('reservation','subscription','fine') NOT NULL,
  status ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  paid_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES user(id),
  FOREIGN KEY (reservation_id) REFERENCES reservation(reservation_id) ON DELETE SET NULL,
  INDEX idx_payment_user (user_id),
  INDEX idx_payment_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_plan (
  plan_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duration_months INT NOT NULL DEFAULT 1,
  zone VARCHAR(50) NOT NULL,
  allowed_user_type VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription (
  subscription_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES user(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plan(plan_id),
  INDEX idx_sub_user (user_id),
  INDEX idx_sub_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS student_discount (
  discount_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  student_id_number VARCHAR(50) NOT NULL,
  university_email VARCHAR(100) NOT NULL,
  institution VARCHAR(150) NOT NULL,
  status ENUM('pending','approved','rejected','revoked') NOT NULL DEFAULT 'pending',
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES user(id),
  INDEX idx_discount_user (user_id),
  INDEX idx_discount_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS violation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id INT NOT NULL,
  user_id INT NOT NULL,
  minutes_overstayed INT NOT NULL DEFAULT 0,
  fine_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('unpaid','paid','waived','disputed') NOT NULL DEFAULT 'unpaid',
  detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES reservation(reservation_id),
  FOREIGN KEY (user_id) REFERENCES user(id),
  INDEX idx_violation_user (user_id),
  INDEX idx_violation_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Seed: Admin user (password: Admin123!)
INSERT IGNORE INTO user (first_name, last_name, email, password_hash, user_type, status)
VALUES ('Admin', 'Parking', 'admin@parking.si', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'active');

-- Seed: Sample parking lots
INSERT IGNORE INTO parking_lot (lot_id, name, location, total_capacity, opening_hours, zone, status) VALUES
(1, 'City Center Garage', 'Main Square 1, Ljubljana', 100, '24/7', 'A', 'active'),
(2, 'University Campus Lot', 'University Street 10, Ljubljana', 50, 'Mon-Fri 06:00-22:00', 'B', 'active'),
(3, 'Shopping Mall Parking', 'Commercial Zone 5, Ljubljana', 200, '08:00-22:00', 'C', 'active');

-- Seed: Pricing rules
INSERT IGNORE INTO pricing_rule (lot_id, user_type, rate_per_hour, peak_start, peak_end, peak_rate) VALUES
(1, NULL, 2.50, '08:00', '18:00', 3.50),
(1, 'student', 1.00, NULL, NULL, NULL),
(2, NULL, 1.50, NULL, NULL, NULL),
(2, 'student', 0.50, NULL, NULL, NULL),
(3, NULL, 2.00, '10:00', '20:00', 3.00);

-- Seed: Subscription plans
INSERT IGNORE INTO subscription_plan (name, price, duration_months, zone, allowed_user_type) VALUES
('Monthly Zone A', 45.00, 1, 'A', NULL),
('Annual Zone A', 450.00, 12, 'A', NULL),
('Student Monthly Zone B', 15.00, 1, 'B', 'student'),
('Monthly Zone B', 30.00, 1, 'B', NULL);
