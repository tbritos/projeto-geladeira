import bcrypt from 'bcryptjs';
import type { BootstrapUserConfig } from '../shared/types';

export const BOOTSTRAP_USERS: BootstrapUserConfig[] = [
  {
    username: process.env.AUTH_ADMIN_USER ?? 'admin',
    passwordHash: process.env.AUTH_ADMIN_PASSWORD_HASH ?? bcrypt.hashSync('admin', 10),
    platformRole: 'SUPER_ADMIN',
    tenantRole: 'TENANT_ADMIN',
  },
  {
    username: process.env.AUTH_OPERATOR_USER ?? 'operador',
    passwordHash: process.env.AUTH_OPERATOR_PASSWORD_HASH ?? bcrypt.hashSync('1234', 10),
    platformRole: 'USER',
    tenantRole: 'TENANT_ADMIN',
  },
];
