export type Property = {
  id: string;
  address: string;
  neighborhood: string;
  propertyType: string;
  status: string;
  price: number | null;
  sizeText: string | null;
  zoning: string | null;
  mls: string | null;
  listingUrl: string | null;
  brokerName: string | null;
  brokerContact: string | null;
  lat: number | null;
  lng: number | null;
  addedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// Convert a Prisma record (Date objects) into a plain serializable DTO.
export function toDTO(p: {
  createdAt: Date;
  updatedAt: Date;
} & Omit<Property, "createdAt" | "updatedAt">): Property {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
