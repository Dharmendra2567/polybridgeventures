import { getPrismaClient } from "../infrastructure/database/prisma.js";

const DEFAULT_ORG_ID = "6e754289-3fcc-4315-b422-1f8758045495";
let cachedOrgId: string = DEFAULT_ORG_ID;

export async function getOrganizationId(): Promise<string> {
  if (cachedOrgId && cachedOrgId !== DEFAULT_ORG_ID) return cachedOrgId;
  try {
    const prisma = getPrismaClient();
    const org = await prisma.organization.findFirst();
    if (org) {
      cachedOrgId = org.id;
      return org.id;
    }
    const created = await prisma.organization.create({
      data: {
        name: "Polybridge Ventures LLP",
        code: "PBV-INDIA",
        baseCurrency: "USD",
        isActive: true,
      },
    });
    cachedOrgId = created.id;
    return created.id;
  } catch {
    return DEFAULT_ORG_ID;
  }
}
