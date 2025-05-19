import { z } from "zod";

export const CreateStoreRequestSchema = z.object({
  name: z
    .string()
    .nonempty("Campo nombre es obligatorio")
    .min(4, "El nombre tiene que tener al menos 4 caracteres"),
  address: z.string().nonempty("Campo dirección es obligatorio"),
  latitude: z.string(),
  longitude: z.string(),
  phoneNumber: z.string(),
  mapsUrl: z.string(),
});

export const CreateStoreAssignmentRequestSchema = z.object({
  storeId: z.number().nonnegative("Id de tienda inválido"),
  userId: z.number().nonnegative("Id de usuario inválido"),
});

export const UpdateStoreLocationRequestSchema = z.object({
  storeId: z.number().positive("Id de tienda inválido"),
  latitude: z.string().nonempty("Campo latitud es requerido"),
  longitude: z.string().nonempty("Campo longitud es requerido"),
});

export type StoreLocationRequest = z.infer<
  typeof UpdateStoreLocationRequestSchema
>;
