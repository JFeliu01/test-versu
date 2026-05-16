CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id),
  channel VARCHAR(50) DEFAULT 'Web',
  status VARCHAR(50) DEFAULT 'Abierta',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO organizations (name) VALUES ('Org A - Retail'), ('Org B - SaaS');

INSERT INTO users (org_id, name, email, password) VALUES 
(1, 'Admin Retail', 'admin@orga.com', '123456'),
(2, 'Admin SaaS', 'admin@orgb.com', '123456');