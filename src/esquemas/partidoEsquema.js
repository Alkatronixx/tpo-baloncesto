import { z } from 'zod';

export const partidoEsquema = z.object({
    id_local: z.number().int(),
    id_visitante: z.number().int(),
    tantos_local: z.number().int().min(0),
    tantos_visitante: z.number().int().min(0),
    finalizado: z.boolean().default(false),
    fecha: z.string().optional(),
    horario: z.string().optional(),
    lugar: z.string().optional()
}).refine((data) => data.id_local !== data.id_visitante, {
    message: "Un equipo no puede jugar contra sí mismo",
    path: ["id_visitante"]
});