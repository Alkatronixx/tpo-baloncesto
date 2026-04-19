import { query } from '../config/db.js';

export const JugadorModelo = {
    create: async (datos) => {
        const sql = `
            INSERT INTO jugadores (nombre, apellido, categoria, id_equipo)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [datos.nombre, datos.apellido, datos.categoria, datos.id_equipo];
        const { rows } = await query(sql, values);
        return rows[0]; 
    },

    getAll: async () => {
        const sql = `
            SELECT j.*, e.nombre_equipo 
            FROM jugadores j
            JOIN equipos e ON j.id_equipo = e.id_equipo
            ORDER BY j.apellido ASC;
        `;
        const { rows } = await query(sql);
        return rows;
    }
};