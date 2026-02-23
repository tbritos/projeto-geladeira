import bcrypt from 'bcryptjs';
import { isAccountStatus, isTenantMemberRole } from '../../services/auth.service';
import type { AccountStatus } from '../../shared/types';
import type { RouteDeps } from '../deps';

const userSelect = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  displayName: true,
  phone: true,
  profilePhoto: true,
  accountStatus: true,
  lastLoginAt: true,
  platformRole: true,
  isActive: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const createTenantUsersService = ({ prisma }: RouteDeps) => {
  const listUsers = async (tenantId: number, includeDeleted: boolean) => {
    const memberships = await prisma.membership.findMany({
      where: {
        tenantId,
        ...(includeDeleted
          ? {}
          : {
              deletedAt: null,
              user: {
                deletedAt: null,
              },
            }),
      },
      include: {
        user: {
          select: userSelect,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map((membership) => ({
      membershipId: membership.id,
      membershipDeletedAt: membership.deletedAt?.toISOString() ?? null,
      role: membership.role,
      tenantId: membership.tenantId,
      user: membership.user,
    }));
  };

  const createTenantUser = async (
    tenantId: number,
    body: {
      username?: string;
      email?: string;
      fullName?: string;
      password?: string;
      displayName?: string;
      phone?: string;
      profilePhoto?: string;
      status?: string;
      role?: string;
    }
  ) => {
    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase() || undefined;
    const fullName = body.fullName?.trim() || undefined;
    const password = body.password;
    const displayName = body.displayName?.trim() || fullName || undefined;
    const phone = body.phone?.trim() || undefined;
    const profilePhoto = body.profilePhoto?.trim() || undefined;
    const statusRaw = body.status?.trim().toUpperCase() || 'ACTIVE';
    const accountStatus: AccountStatus = isAccountStatus(statusRaw) ? statusRaw : 'ACTIVE';
    const memberRoleRaw = body.role?.trim().toUpperCase() || 'VIEWER';

    if (!username) return { error: 'username obrigatorio' } as const;
    if (!isTenantMemberRole(memberRoleRaw)) {
      return { error: 'role invalida. Use OWNER, TENANT_ADMIN, OPERATOR ou VIEWER' } as const;
    }

    let user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      if (!password || password.length < 4) {
        return { error: 'password obrigatoria com pelo menos 4 caracteres' } as const;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          username,
          email,
          fullName,
          displayName,
          phone,
          profilePhoto,
          passwordHash,
          platformRole: 'USER',
          accountStatus,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: email ?? user.email,
          fullName: fullName ?? user.fullName,
          displayName: displayName ?? user.displayName,
          phone: phone ?? user.phone,
          profilePhoto: profilePhoto ?? user.profilePhoto,
          accountStatus,
          isActive: accountStatus === 'ACTIVE',
          deletedAt: null,
        },
      });
    }

    if (!user.isActive || user.deletedAt || user.accountStatus !== 'ACTIVE') {
      return { error: 'Usuario inativo' } as const;
    }

    const membership = await prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId,
        },
      },
      update: {
        role: memberRoleRaw,
        deletedAt: null,
      },
      create: {
        userId: user.id,
        tenantId,
        role: memberRoleRaw,
      },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    return {
      membershipId: membership.id,
      membershipDeletedAt: membership.deletedAt?.toISOString() ?? null,
      role: membership.role,
      tenantId: membership.tenantId,
      user: membership.user,
    } as const;
  };

  return {
    listUsers,
    createTenantUser,
  };
};
