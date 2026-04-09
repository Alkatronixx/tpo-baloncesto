import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/logos'); 
  },
  filename: (req, file, cb) => {
    const nombreEquipo = req.body.nombre_equipo 
      ? req.body.nombre_equipo.toLowerCase().split(' ').join('-') 
      : 'equipo-sin-nombre';

    const extension = path.extname(file.originalname); 
    
    cb(null, `${nombreEquipo}-${Date.now()}${extension}`);
  }
});

export const upload = multer({ storage });