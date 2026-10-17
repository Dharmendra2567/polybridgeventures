import type { FastifyInstance } from 'fastify';
import { authRoutes } from '../../modules/auth/presentation/auth.routes.js';
import { crmRoutes } from '../../modules/crm/presentation/crm.routes.js';
import { catalogueRoutes } from '../../modules/catalogue/presentation/catalogue.routes.js';
import { salesRoutes } from '../../modules/sales/presentation/sales.routes.js';
import { procurementRoutes } from '../../modules/procurement/presentation/procurement.routes.js';
import { fulfilmentRoutes } from '../../modules/fulfilment/presentation/fulfilment.routes.js';
import { financeRoutes } from '../../modules/finance/presentation/finance.routes.js';
import { usersRoutes } from '../../modules/users/presentation/users.routes.js';
import { auditRoutes } from '../../modules/audit/presentation/audit.routes.js';
import { fxRoutes } from '../../modules/fx/presentation/fx.routes.js';
import { documentsRoutes } from '../../modules/documents/presentation/documents.routes.js';

/** Aggregates sidebar-aligned trade modules under `/api/v1`. */
export async function tradeRoutes(server: FastifyInstance): Promise<void> {
  await server.register(authRoutes);
  await server.register(crmRoutes);
  await server.register(catalogueRoutes);
  await server.register(salesRoutes);
  await server.register(procurementRoutes);
  await server.register(fulfilmentRoutes);
  await server.register(financeRoutes);
  await server.register(usersRoutes);
  await server.register(auditRoutes);
  await server.register(fxRoutes);
  await server.register(documentsRoutes);
}
