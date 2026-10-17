import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../../../infrastructure/logging/logger.js";
import { getOrganizationId } from "../../../shared/organization.context.js";
import { logAudit } from "../../../shared/audit.service.js";
import { getCurrentSessionUserId } from "../../../shared/session.store.js";
import { UserProfile } from "../../trade-data.js";
import type { PrismaClient } from "../../../generated/client/index.js";

/** Application layer for the users bounded context. */
export class UsersService {
  constructor(readonly prisma: PrismaClient) {}

  registerRoutes(server: FastifyInstance): void {
    const prisma = this.prisma;
    // -------------------------------------------------------------
    // INTERNAL USERS MANAGEMENT (Pure Database)
    // -------------------------------------------------------------
    server.get("/users", async (_req: FastifyRequest, reply: FastifyReply) => {
      try {
        const dbUsers = await prisma.user.findMany({
          orderBy: { createdAt: "asc" },
          include: {
            department: true,
            subdepartment: true,
            designation: true,
            userRoles: { include: { role: true } },
          },
        });

        const users: UserProfile[] = dbUsers.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim(),
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          phone: u.phoneNumber || "",
          department: u.department?.name || "Executive Management",
          subdepartment: u.subdepartment?.name || "Managing Desk",
          designation: u.designation?.title || "Staff",
          role: u.userRoles[0]?.role.name || "TRADER",
          dataScope: "GLOBAL",
          approvalLimit: Number(u.designation?.defaultApprovalLimit || 0),
          reportingTo: "Rahul Patel",
          status: u.isActive ? "ACTIVE" : "INACTIVE",
          isMfaEnabled: u.isMfaEnabled,
          createdAt: u.createdAt.toISOString(),
        }));

        return reply.send({ users });
      } catch (err) {
        logger.error({ err }, "[Users] Failed to fetch users from DB");
        return reply.status(500).send({ error: (err as Error).message });
      }
    });

    server.post(
      "/users",
      async (
        req: FastifyRequest<{ Body: Partial<UserProfile> }>,
        reply: FastifyReply,
      ) => {
        const data = req.body || {};
        if (!data.name && !data.firstName && !data.lastName) {
          return reply.status(400).send({ error: "User name is required" });
        }
        if (!data.email) {
          return reply.status(400).send({ error: "User email is required" });
        }

        const orgId = await getOrganizationId();
        const fullName = (
          data.name || `${data.firstName || ""} ${data.lastName || ""}`
        ).trim();
        const nameParts = fullName.split(" ");
        const firstName = data.firstName || nameParts[0] || "Staff";
        const lastName =
          data.lastName ||
          (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Member");

        try {
          let dept = await prisma.department.findFirst({
            where: data.department
              ? { name: { contains: data.department, mode: "insensitive" } }
              : undefined,
          });
          if (!dept) dept = await prisma.department.findFirst();

          let des = await prisma.designation.findFirst({
            where: data.designation
              ? { title: { contains: data.designation, mode: "insensitive" } }
              : undefined,
          });
          if (!des) des = await prisma.designation.findFirst();

          if (!dept || !des) {
            throw new Error("Valid department and designation are required");
          }

          const demoHash =
            "$argon2id$v=19$m=65536,t=3,p=1$fakehasheddemokey$validmockhashforlocaldev";

          const created = await prisma.user.create({
            data: {
              organizationId: orgId,
              email: data.email.toLowerCase().trim(),
              passwordHash: demoHash,
              firstName,
              lastName,
              phoneNumber: data.phone || "+91 98000 00000",
              departmentId: dept.id,
              designationId: des.id,
              isActive: data.status !== "INACTIVE",
              isMfaEnabled: data.isMfaEnabled !== false,
            },
            include: {
              department: true,
              subdepartment: true,
              designation: true,
              userRoles: { include: { role: true } },
            },
          });

          // Link requested role if found
          const requestedRole = data.role || "TRADER";
          const roleRecord = await prisma.role.findFirst({
            where: { name: { equals: requestedRole, mode: "insensitive" } },
          });
          if (roleRecord) {
            await prisma.userRole.create({
              data: {
                userId: created.id,
                roleId: roleRecord.id,
              },
            });
          }

          const newUser: UserProfile = {
            id: created.id,
            name: `${created.firstName} ${created.lastName}`.trim(),
            firstName: created.firstName,
            lastName: created.lastName,
            email: created.email,
            phone: created.phoneNumber || "",
            department: created.department?.name || "Executive Management",
            subdepartment: created.subdepartment?.name || "Managing Desk",
            designation: created.designation?.title || "Staff",
            role: requestedRole,
            dataScope: data.dataScope || "DEPARTMENT",
            approvalLimit: Number(data.approvalLimit || 0),
            reportingTo: data.reportingTo || "Rahul Patel",
            status: created.isActive ? "ACTIVE" : "INACTIVE",
            isMfaEnabled: created.isMfaEnabled,
            createdAt: created.createdAt.toISOString(),
          };

          await logAudit(
            "System",
            "CREATE",
            "User",
            created.id,
            `Created user ${newUser.name} (${newUser.email})`,
          );
          return reply.status(201).send({ user: newUser });
        } catch (err) {
          logger.error({ err }, "[Users] Error creating user in database");
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );

    server.put(
      "/users/:id",
      async (
        req: FastifyRequest<{
          Params: { id: string };
          Body: Partial<UserProfile>;
        }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        const data = req.body || {};

        let firstName: string | undefined;
        let lastName: string | undefined;
        if (data.name) {
          const parts = data.name.trim().split(" ");
          firstName = parts[0];
          lastName = parts.slice(1).join(" ") || "";
        }

        try {
          const updated = await prisma.user.update({
            where: { id },
            data: {
              ...(firstName ? { firstName } : {}),
              ...(lastName !== undefined ? { lastName } : {}),
              ...(data.email ? { email: data.email.toLowerCase().trim() } : {}),
              ...(data.phone !== undefined ? { phoneNumber: data.phone } : {}),
              ...(data.status ? { isActive: data.status === "ACTIVE" } : {}),
            },
            include: {
              department: true,
              subdepartment: true,
              designation: true,
              userRoles: { include: { role: true } },
            },
          });

          const mapped: UserProfile = {
            id: updated.id,
            name: `${updated.firstName} ${updated.lastName}`.trim(),
            firstName: updated.firstName,
            lastName: updated.lastName,
            email: updated.email,
            phone: updated.phoneNumber || "",
            department: updated.department?.name || "Executive Management",
            subdepartment: updated.subdepartment?.name || "Managing Desk",
            designation: updated.designation?.title || "Staff",
            role: updated.userRoles[0]?.role.name || "TRADER",
            dataScope: "GLOBAL",
            approvalLimit: Number(
              updated.designation?.defaultApprovalLimit || 0,
            ),
            reportingTo: "Rahul Patel",
            status: updated.isActive ? "ACTIVE" : "INACTIVE",
            isMfaEnabled: updated.isMfaEnabled,
            createdAt: updated.createdAt.toISOString(),
          };

          return reply.send({ user: mapped });
        } catch (err) {
          return reply.status(404).send({ error: (err as Error).message });
        }
      },
    );

    server.patch(
      "/users/:id/status",
      async (
        req: FastifyRequest<{
          Params: { id: string };
          Body: { status: UserProfile["status"] };
        }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        const { status } = req.body || {};

        if (id === getCurrentSessionUserId() && status !== "ACTIVE") {
          return reply.status(400).send({
            error: "Cannot deactivate the currently active session user.",
          });
        }

        try {
          const updated = await prisma.user.update({
            where: { id },
            data: { isActive: status === "ACTIVE" },
            include: {
              department: true,
              subdepartment: true,
              designation: true,
              userRoles: { include: { role: true } },
            },
          });

          const mapped: UserProfile = {
            id: updated.id,
            name: `${updated.firstName} ${updated.lastName}`.trim(),
            firstName: updated.firstName,
            lastName: updated.lastName,
            email: updated.email,
            phone: updated.phoneNumber || "",
            department: updated.department?.name || "Executive Management",
            subdepartment: updated.subdepartment?.name || "Managing Desk",
            designation: updated.designation?.title || "Staff",
            role: updated.userRoles[0]?.role.name || "TRADER",
            dataScope: "GLOBAL",
            approvalLimit: Number(
              updated.designation?.defaultApprovalLimit || 0,
            ),
            reportingTo: "Rahul Patel",
            status: updated.isActive ? "ACTIVE" : "INACTIVE",
            isMfaEnabled: updated.isMfaEnabled,
            createdAt: updated.createdAt.toISOString(),
          };

          return reply.send({ user: mapped });
        } catch (err) {
          return reply.status(404).send({ error: (err as Error).message });
        }
      },
    );

    server.delete(
      "/users/:id",
      async (
        req: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        if (id === getCurrentSessionUserId()) {
          return reply.status(400).send({
            error:
              "Cannot delete the currently authenticated active session user.",
          });
        }

        try {
          const userCount = await prisma.user.count();
          if (userCount <= 1) {
            return reply.status(400).send({
              error: "Cannot delete the last remaining internal system user.",
            });
          }

          await prisma.userRole.deleteMany({ where: { userId: id } });
          await prisma.user.delete({ where: { id } });
          await logAudit(
            "System",
            "DELETE",
            "User",
            id,
            `Removed user account ${id}`,
          );
          return reply.send({ success: true, id });
        } catch (err) {
          return reply.status(400).send({ error: (err as Error).message });
        }
      },
    );
  }
}
