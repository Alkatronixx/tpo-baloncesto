import { query } from '../config/db.js';

export const EquipoModelo = {

    getAll: async () => {
        // Le sumamos el desempate por diferencia de tantos, ¡muy importante en básquet!
        const sql = `
            SELECT * FROM equipos 
            ORDER BY puntos_totales DESC, tantos_diferencia DESC
        `;
        const res = await query(sql);
        return res.rows;
    },

    create: async (datos) => {
        const { 
            nombre_equipo, entrenador, logo_url, estadio, // <--- Agregamos estadio
            puntos_totales, partidos_jugados, tantos_favor, tantos_contra, tantos_diferencia 
        } = datos;

        const sql = `
            INSERT INTO equipos 
            (nombre_equipo, entrenador, logo_url, estadio, puntos_totales, partidos_jugados, tantos_favor, tantos_contra, tantos_diferencia)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) -- <--- Agregamos el $9
            RETURNING *`;

        const values = [
            nombre_equipo, 
            entrenador, 
            logo_url, 
            estadio || 'Estadio Municipal', // <--- Valor por defecto
            puntos_totales || 0, 
            partidos_jugados || 0, 
            tantos_favor || 0, 
            tantos_contra || 0, 
            tantos_diferencia || 0
        ];

        const res = await query(sql, values);

        // Cambiamos res.rows por res.rows para que devuelva el objeto directo
        return res.rows[0]; 
    }
};