import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

// Creamos una instancia de Pool para administrar las conexiones a la base de datos
export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

//Exportamos una función 'query' simplificada
export const query = (text, params) => pool.query(text, params);