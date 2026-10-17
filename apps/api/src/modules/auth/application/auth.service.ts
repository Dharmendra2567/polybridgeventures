import { logger } from "../../../infrastructure/logging/logger.js";
import { logAudit } from "../../../shared/audit.service.js";
import { UUID_REGEX } from "../../../shared/uuid.util.js";
import {
  getCurrentSessionUserId,
  setCurrentSessionUserId,
  clearCurrentSessionUserId,
} from "../../../shared/session.store.js";
import { UserProfile } from "../../trade-data.js";
import type { PrismaClient } from "../../../generated/client/index.js";
import type { HttpResult } from "../../../shared/http-result.js";

/** Application layer for the auth bounded context. */
export class AuthService {
  constructor(readonly prisma: PrismaClient) {}

  async getSession(): Promise<HttpResult> {
    const prisma = this.prisma;
    try {
      const dbUsers = await prisma.user.findMany({
        where: { isActive: true },
        include: {
          department: true,
          subdepartment: true,
          designation: true,
          userRoles: { include: { role: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      if (dbUsers.length === 0) {
        return {
          status: 200,
          body: {
            authenticated: false,
            user: null,
            availableUsers: [],
          },
        };
      }

      const mappedUsers: UserProfile[] = dbUsers.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phoneNumber || "",
        department: u.department?.name || "Executive Management",
        subdepartment: u.subdepartment?.name || "Managing Desk",
        designation: u.designation?.title || "Managing Partner",
        role: u.userRoles[0]?.role.name || "ADMINISTRATOR",
        dataScope: "GLOBAL",
        approvalLimit: Number(u.designation?.defaultApprovalLimit || 100000),
        status: u.isActive ? "ACTIVE" : "INACTIVE",
        isMfaEnabled: u.isMfaEnabled,
        createdAt: u.createdAt.toISOString(),
      }));

      const activeUser =
        (getCurrentSessionUserId() &&
          mappedUsers.find((u) => u.id === getCurrentSessionUserId())) ||
        mappedUsers[0]!;

      return {
        status: 200,
        body: {
          authenticated: true,
          user: activeUser,
          availableUsers: mappedUsers,
        },
      };
    } catch (err) {
      logger.error({ err }, "[Auth] Error loading session users from DB");
      return { status: 500, body: { error: (err as Error).message } };
    }
  }

  async login(req: {
    body?: { email?: string; userId?: string };
  }): Promise<HttpResult> {
    const prisma = this.prisma;
    const { email, userId } = req.body || {};
    try {
      let dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email
              ? [
                  {
                    email: {
                      equals: email.toLowerCase().trim(),
                      mode: "insensitive" as const,
                    },
                  },
                ]
              : []),
            ...(userId && UUID_REGEX.test(userId) ? [{ id: userId }] : []),
          ],
        },
        include: {
          department: true,
          subdepartment: true,
          designation: true,
          userRoles: { include: { role: true } },
        },
      });

      if (!dbUser) {
        // Fallback to first active DB user if no matching email was provided
        dbUser = await prisma.user.findFirst({
          where: { isActive: true },
          include: {
            department: true,
            subdepartment: true,
            designation: true,
            userRoles: { include: { role: true } },
          },
        });
      }

      if (!dbUser) {
        return {
          status: 401,
          body: { error: "No active user accounts found in database" },
        };
      }

      setCurrentSessionUserId(dbUser.id);
      const userProfile: UserProfile = {
        id: dbUser.id,
        name: `${dbUser.firstName} ${dbUser.lastName}`.trim(),
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        email: dbUser.email,
        phone: dbUser.phoneNumber || "",
        department: dbUser.department?.name || "Executive Management",
        subdepartment: dbUser.subdepartment?.name || "Managing Desk",
        designation: dbUser.designation?.title || "Managing Partner",
        role: dbUser.userRoles[0]?.role.name || "ADMINISTRATOR",
        dataScope: "GLOBAL",
        approvalLimit: Number(
          dbUser.designation?.defaultApprovalLimit || 100000,
        ),
        status: dbUser.isActive ? "ACTIVE" : "INACTIVE",
        isMfaEnabled: dbUser.isMfaEnabled,
        createdAt: dbUser.createdAt.toISOString(),
      };

      await logAudit(
        userProfile.name,
        "LOGIN",
        "UserSession",
        dbUser.id,
        `User signed in: ${userProfile.email}`,
        dbUser.id,
      );
      return { status: 200, body: { success: true, user: userProfile } };
    } catch (err) {
      logger.error({ err }, "[Auth] Login DB error");
      return { status: 500, body: { error: (err as Error).message } };
    }
  }

  async logout(): Promise<HttpResult> {
    const sessionUserId = getCurrentSessionUserId();
    if (sessionUserId) {
      await logAudit(
        "User",
        "LOGOUT",
        "UserSession",
        sessionUserId,
        "User signed out",
        sessionUserId,
      );
      clearCurrentSessionUserId();
    }
    return { status: 200, body: { success: true } };
  }
}
