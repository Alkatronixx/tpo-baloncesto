import { query } from '../config/db.js';

// modelo para manejar las operaciones relacionadas con los usuarios
const Usuario = {
    // buscamos un usuario por su nombre de usuario
    buscarPorNombre: async (nombre_usuario) => {
        const sql = 'SELECT * FROM usuarios WHERE nombre_usuario = $1'; 
        const { rows } = await query(sql, [nombre_usuario]); 
        return rows[0] ?? null;
    }
};

// exportamos el modelo de usuario para que pueda ser utilizado en otras partes de la aplicación
export default Usuario;