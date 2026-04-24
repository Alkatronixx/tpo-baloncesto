import { query } from '../config/db.js';

// modelo para manejar las operaciones relacionadas con los equipos
export const EquipoModelo = {
    getAll: async () => {
        // obtenemos todos los equipos ordenados por puntos totales y diferencia de tantos 
        const sql = `
            SELECT * FROM equipos 
            ORDER BY puntos_totales DESC, tantos_diferencia DESC
        `;
        const res = await query(sql);
        return res.rows;
    },

    create: async (datos) => {
        // extraemos los datos necesarios para crear un nuevo equipo
        const { 
            nombre_equipo, entrenador, logo_url, estadio, 
            puntos_totales, partidos_jugados, tantos_favor, tantos_contra, tantos_diferencia 
        } = datos;

        // insertamos el nuevo equipo en la base de datos
        const sql = `
            INSERT INTO equipos 
            (nombre_equipo, entrenador, logo_url, estadio, puntos_totales, partidos_jugados, tantos_favor, tantos_contra, tantos_diferencia)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *`;

        // asignamos los valores a los parámetros de la consulta
        const values = [
            nombre_equipo, 
            entrenador, 
            logo_url, 
            estadio,
            puntos_totales || 0, 
            partidos_jugados || 0, 
            tantos_favor || 0, 
            tantos_contra || 0, 
            tantos_diferencia || 0
        ];

        // ejecutamos la consulta y obtenemos el resultado
        const res = await query(sql, values);

        // retornamos el nuevo equipo creado
        return res.rows[0]; 
    }
};