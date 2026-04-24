import Usuario from '../modelo/usuarioModelo.js'; 
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
    // Extraemos el nombre de usuario y la contraseña del cuerpo de la solicitud
    const { nombre_usuario, password } = req.body;

    try {
        // Buscamos al usuario en la base de datos por su nombre de usuario
        const usuario = await Usuario.buscarPorNombre(nombre_usuario);
        
        // Si no se encuentra el usuario, respondemos con un error de autenticación
        if (!usuario) {
            return res.status(401).json({ mensaje: 'Usuario no encontrado' });
        }

        // Obtenemos el hash de la contraseña almacenada en la base de datos
        const hashDB = usuario.password;

        // Si por alguna razón no se encuentra el hash, respondemos con un error interno
        if (!hashDB) {
            return res.status(500).json({ mensaje: 'Error interno del servidor' });
        }

        // Comparamos la contraseña proporcionada con el hash almacenado
        const esValida = await bcrypt.compare(password, hashDB); 
                
        // Si la contraseña no es válida, respondemos con un error de autenticación
        if (!esValida) {
            return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
        }

        // Si la autenticación es exitosa, generamos un token JWT con el ID y rol del usuario
        const token = jwt.sign(
            { id: usuario.id_usuario, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        // Respondemos con un mensaje de éxito y el token generado
        res.json({ mensaje: 'Login exitoso', token });

    // Manejamos cualquier error que ocurra durante el proceso de autenticación
    } catch (error) {
        console.error("ERROR EN LOGIN:", error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};