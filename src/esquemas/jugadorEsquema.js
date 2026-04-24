import { z } from 'zod';

// Esquema de validación para el jugador
export const jugadorEsquema = z.object({
    nombre: z.string().min(3, "El nombre es muy corto").max(100),
    apellido: z.string().min(3, "El apellido es muy corto").max(100),
    categoria: z.string().min(3, "La categoría es muy corta").max(50),
    id_equipo: z.number().int("Debe ser un ID de equipo válido").positive("El ID de equipo debe ser un número positivo")
});