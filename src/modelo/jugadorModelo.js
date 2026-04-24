import { query } from '../config/db.js';

// modelo para manejar las operaciones relacionadas con los jugadores
export const JugadorModelo = {
    create: async (datos) => {
        // insertamos un nuevo jugador en la base de datos
        const sql = `
            INSERT INTO jugadores (nombre, apellido, categoria, id_equipo)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        // asignamos los valores a los parámetros de la consulta
        const values = [datos.nombre, datos.apellido, datos.categoria, datos.id_equipo];
        const { rows } = await query(sql, values);
        return rows[0]; 
    },

    // obtenemos todos los jugadores junto con el nombre de su equipo
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