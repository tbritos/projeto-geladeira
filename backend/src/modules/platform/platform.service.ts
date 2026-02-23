import bcrypt from 'bcryptjs';
import { FALLBACK_MAX_TEMP, FALLBACK_MIN_TEMP } from '../../config/env';
import { isAccountStatus } from '../../services/auth.service';
import { readAuditLogs } from '../../services/audit.service';
import type { AccountStatus, TenantMemberRole } from '../../shared/types';
import type { RouteDeps } from '../deps';

export const createPlatformService = ({ prisma }: RouteDeps) => {
  const listTenants = async (includeDeleted: boolean) => {
    return prisma.tenant.findMany({
      where: includeDeleted ? undefined : { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            readings: true,
            devices: true,
            users: true,
          },
        },
      },
    });
  };

  const listAudit = async (query: {
    tenantId?: string;
    actorUsername?: string;
    action?: string;
    from?: string;
    to?: string;
    limit?: string;
  }) => {
    const targetTenantId = Number(query.tenantId ?? NaN);
    const actorUsername = query.actorUsername?.trim().toLowerCase();
    const action = query.action?.trim();
    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;
    const limit = Math.min(Math.max(Number(query.limit ?? 100), 1), 500);

    const logs = await readAuditLogs();
    return logs
      .filter((entry) => {
        if (Number.isFinite(targetTenantId)) {
          const matchesActorTenant = entry.actorTenantId === targetTenantId;
          const matchesTargetTenant = entry.targetTenantId === targetTenantId;
          if (!matchesActorTenant && !matchesTargetTenant) return false;
        }
        if (actorUsername && entry.actorUsername.toLowerCase() !== actorUsername) return false;
        if (action && entry.action !== action) return false;
        const ts = new Date(entry.timestamp).getTime();
        if (fromDate && Number.isFinite(fromDate.getTime()) && ts < fromDate.getTime()) return false;
        if (toDate && Number.isFinite(toDate.getTime()) && ts > toDate.getTime()) return false;
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  };

  const normalizeCreateTenantInput = (body: {
    name?: string;
    slug?: string;
    tradeName?: string;
    legalName?: string;
    cnpj?: string;
    accountStatus?: string;
    owner?: {
      username?: string;
      email?: string;
      fullName?: string;
      phone?: string;
      password?: string;
      role?: string;
    };
  }) => {
    const name = body?.name?.trim() || body?.tradeName?.trim();
    const slug = body?.slug?.trim().toLowerCase();
    const tradeName = body?.tradeName?.trim() || name;
    const legalName = body?.legalName?.trim() || undefined;
    const cnpj = body?.cnpj?.trim() || undefined;
    const rawStatus = body?.accountStatus?.trim().toUpperCase() || 'ACTIVE';
    const accountStatus: AccountStatus = isAccountStatus(rawStatus) ? rawStatus : 'ACTIVE';

    const owner = body.owner;
    const ownerUsername = owner?.username?.trim();
    const ownerPassword = owner?.password;
    const ownerEmail = owner?.email?.trim().toLowerCase() || undefined;
    const ownerFullName = owner?.fullName?.trim() || undefined;
    const ownerPhone = owner?.phone?.trim() || undefined;
    const ownerRoleRaw = owner?.role?.trim().toUpperCase() || 'OWNER';
    const ownerRole: TenantMemberRole =
      ownerRoleRaw === 'ADMIN' ? 'TENANT_ADMIN' : (ownerRoleRaw as TenantMemberRole);
    const shouldCreateOwner = Boolean(ownerUsername || ownerEmail || ownerFullName);

    return {
      name,
      slug,
      tradeName,
      legalName,
      cnpj,
      accountStatus,
      ownerUsername,
      ownerPassword,
      ownerEmail,
      ownerFullName,
      ownerPhone,
      ownerRole,
      shouldCreateOwner,
    };
  };

  const createTenantWithOwner = async (body: {
    name?: string;
    slug?: string;
    tradeName?: string;
    legalName?: string;
    cnpj?: string;
    accountStatus?: string;
    owner?: {
      username?: string;
      email?: string;
      fullName?: string;
      phone?: string;
      password?: string;
      role?: string;
    };
  }) => {
    const input = normalizeCreateTenantInput(body);

    if (!input.name || !input.slug) {
      return { error: 'name/tradeName e slug sao obrigatorios' } as const;
    }
    const tenantName = input.name;
    const tenantSlug = input.slug;

    if (input.shouldCreateOwner) {
      if (!input.ownerUsername || !input.ownerPassword || input.ownerPassword.length < 4) {
        return { error: 'Para criar owner/admin, informe username e password (min 4).' } as const;
      }
      if (!['OWNER', 'TENANT_ADMIN'].includes(input.ownerRole)) {
        return { error: 'role do primeiro usuario deve ser OWNER ou TENANT_ADMIN' } as const;
      }
    }

    const tenant = await prisma.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: tenantSlug,
          tradeName: input.tradeName,
          legalName: input.legalName,
          cnpj: input.cnpj,
          accountStatus: input.accountStatus,
          isActive: input.accountStatus === 'ACTIVE',
        },
      });

      await tx.device.create({
        data: {
          tenantId: createdTenant.id,
          externalId: `${tenantSlug}-device-01`,
          name: `Dispositivo principal ${tenantName}`,
        },
      });

      await tx.temperatureSetting.upsert({
        where: { tenantId: createdTenant.id },
        update: {},
        create: {
          tenantId: createdTenant.id,
          minTemp: FALLBACK_MIN_TEMP,
          maxTemp: FALLBACK_MAX_TEMP,
        },
      });

      if (input.shouldCreateOwner && input.ownerUsername && input.ownerPassword) {
        const passwordHash = await bcrypt.hash(input.ownerPassword, 10);
        let createdUser = await tx.user.findUnique({ where: { username: input.ownerUsername } });

        if (!createdUser) {
          createdUser = await tx.user.create({
            data: {
              username: input.ownerUsername,
              email: input.ownerEmail,
              fullName: input.ownerFullName,
              displayName: input.ownerFullName || input.ownerUsername,
              phone: input.ownerPhone,
              passwordHash,
              platformRole: 'USER',
              accountStatus: 'ACTIVE',
            },
          });
        } else {
          createdUser = await tx.user.update({
            where: { id: createdUser.id },
            data: {
              email: input.ownerEmail ?? createdUser.email,
              fullName: input.ownerFullName ?? createdUser.fullName,
              displayName: input.ownerFullName ?? createdUser.displayName,
              phone: input.ownerPhone ?? createdUser.phone,
              passwordHash,
              accountStatus: 'ACTIVE',
              isActive: true,
              deletedAt: null,
            },
          });
        }

        await tx.membership.upsert({
          where: {
            userId_tenantId: {
              userId: createdUser.id,
              tenantId: createdTenant.id,
            },
          },
          update: {
            role: input.ownerRole,
            deletedAt: null,
          },
          create: {
            userId: createdUser.id,
            tenantId: createdTenant.id,
            role: input.ownerRole,
          },
        });
      }

      return createdTenant;
    });

    return {
      tenant,
      metadata: {
        ownerCreated: input.shouldCreateOwner,
        ownerRole: input.shouldCreateOwner ? input.ownerRole : undefined,
      },
    } as const;
  };

  return {
    listTenants,
    listAudit,
    createTenantWithOwner,
  };
};

export type PlatformService = ReturnType<typeof createPlatformService>;
