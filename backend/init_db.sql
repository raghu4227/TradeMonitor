-- Run this once to create the database
-- Execute as a PostgreSQL superuser

CREATE DATABASE trademonitor;
\c trademonitor;

-- Tables are auto-created by SQLAlchemy on startup via init_db()
-- This file is for manual reference only.

-- Optional: create a dedicated user
-- CREATE USER tradeuser WITH PASSWORD 'yourpassword';
-- GRANT ALL PRIVILEGES ON DATABASE trademonitor TO tradeuser;
