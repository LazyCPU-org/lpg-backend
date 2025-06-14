import { z } from "zod";
import { CustomerTypeEnum } from "../../db/schemas/customers";

// Create Customer Request
export const CreateCustomerRequestSchema = z.object({
  firstName: z
    .string()
    .nonempty("Campo nombre es obligatorio")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  lastName: z
    .string()
    .nonempty("Campo apellido es obligatorio")
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(50, "El apellido no puede exceder 50 caracteres"),
  phoneNumber: z
    .string()
    .nonempty("Campo teléfono es obligatorio")
    .regex(/^(\+51)?[0-9]{9}$/, "Formato de teléfono peruano inválido")
    .transform(phone => phone.startsWith('+51') ? phone : `+51${phone}`),
  alternativePhone: z
    .string()
    .regex(/^(\+51)?[0-9]{9}$/, "Formato de teléfono peruano inválido")
    .transform(phone => phone.startsWith('+51') ? phone : `+51${phone}`)
    .optional(),
  address: z
    .string()
    .nonempty("Campo dirección es obligatorio")
    .min(10, "La dirección debe ser más específica")
    .max(500, "La dirección es demasiado larga"),
  locationReference: z
    .string()
    .max(200, "La referencia es demasiado larga")
    .optional(),
  customerType: z
    .nativeEnum(CustomerTypeEnum)
    .default(CustomerTypeEnum.REGULAR),
  rating: z
    .number()
    .min(1, "La calificación debe ser entre 1 y 5")
    .max(5, "La calificación debe ser entre 1 y 5")
    .optional(),
});

export type CreateCustomerRequest = z.infer<typeof CreateCustomerRequestSchema>;

// Update Customer Request
export const UpdateCustomerRequestSchema = z.object({
  firstName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres")
    .optional(),
  lastName: z
    .string()
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(50, "El apellido no puede exceder 50 caracteres")
    .optional(),
  phoneNumber: z
    .string()
    .regex(/^(\+51)?[0-9]{9}$/, "Formato de teléfono peruano inválido")
    .transform(phone => phone.startsWith('+51') ? phone : `+51${phone}`)
    .optional(),
  alternativePhone: z
    .string()
    .regex(/^(\+51)?[0-9]{9}$/, "Formato de teléfono peruano inválido")
    .transform(phone => phone.startsWith('+51') ? phone : `+51${phone}`)
    .optional(),
  address: z
    .string()
    .min(10, "La dirección debe ser más específica")
    .max(500, "La dirección es demasiado larga")
    .optional(),
  locationReference: z
    .string()
    .max(200, "La referencia es demasiado larga")
    .optional(),
  customerType: z.nativeEnum(CustomerTypeEnum).optional(),
  rating: z
    .number()
    .min(1, "La calificación debe ser entre 1 y 5")
    .max(5, "La calificación debe ser entre 1 y 5")
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerRequestSchema>;

// Customer Search Request (for phone/name lookup)
export const CustomerSearchRequestSchema = z.object({
  phone: z
    .string()
    .regex(/^(\+51)?[0-9]{9}$/, "Formato de teléfono peruano inválido")
    .transform(phone => phone.startsWith('+51') ? phone : `+51${phone}`)
    .optional(),
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .optional(),
  customerType: z.nativeEnum(CustomerTypeEnum).optional(),
  isActive: z.boolean().default(true),
}).refine(
  (data) => data.phone || data.name,
  {
    message: "Debe proporcionar teléfono o nombre para buscar",
    path: ["phone", "name"],
  }
);

export type CustomerSearchRequest = z.infer<typeof CustomerSearchRequestSchema>;

// Quick Customer Creation (for UX order flow)
export const QuickCustomerCreationSchema = z.object({
  customerName: z
    .string()
    .nonempty("Nombre del cliente es obligatorio")
    .min(4, "El nombre completo debe tener al menos 4 caracteres")
    .max(100, "El nombre es demasiado largo"),
  customerPhone: z
    .string()
    .nonempty("Teléfono del cliente es obligatorio")
    .regex(/^(\+51)?[0-9]{9}$/, "Formato de teléfono peruano inválido")
    .transform(phone => phone.startsWith('+51') ? phone : `+51${phone}`),
  deliveryAddress: z
    .string()
    .nonempty("Dirección de entrega es obligatoria")
    .min(10, "La dirección debe ser más específica"),
  locationReference: z
    .string()
    .max(200, "La referencia es demasiado larga")
    .optional(),
});

export type QuickCustomerCreation = z.infer<typeof QuickCustomerCreationSchema>;