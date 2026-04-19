import Usuario from '../modelo/usuarioModelo.js'; 
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
    const { nombre_usuario, password } = req.body;

    try {
        const usuario = await Usuario.buscarPorNombre(nombre_usuario);
        
        if (!usuario) {
            return res.status(401).json({ mensaje: 'Usuario no encontrado' });
        }

        const hashDB = usuario.password || usuario.contrasena || usuario.Password;

        if (!hashDB) {
            throw new Error("La columna 'password' no se encuentra en el objeto devuelto por la DB");
        }

        const esValida = await bcrypt.compare(password, hashDB); 
                
        if (!esValida) {
            return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: usuario.id_usuario, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.json({ mensaje: 'Login exitoso', token });

    } catch (error) {
        console.error("ERROR EN LOGIN:", error);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};