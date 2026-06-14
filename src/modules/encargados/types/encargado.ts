export type Encargado = {
  id: string;
  rut: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  clientId: string;
  client: { id: string; name: string; code: string };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { name: string } | null;
};

export type EncargadoInput = {
  rut: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  clientId: string;
};
