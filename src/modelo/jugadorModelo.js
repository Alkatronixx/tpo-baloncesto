import { pool } from '../config/db.js';

export const JugadorModelo = {
    create: async (datos) => {
        const query = `
            INSERT INTO jugadores (nombre, apellido, categoria, id_equipo)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [datos.nombre, datos.apellido, datos.categoria, datos.id_equipo];
        const { rows } = await pool.query(query, values);
        return rows;
    },

    getAll: async () => {
        const query = `
            SELECT j.*, e.nombre_equipo 
            FROM jugadores j
            JOIN equipos e ON j.id_equipo = e.id_equipo
            ORDER BY j.apellido ASC;
        `;
        const { rows } = await pool.query(query);
        return rows;
    }
};