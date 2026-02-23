-- Tenant
ALTER TABLE "Tenant" ADD COLUMN "tradeName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "legalName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "cnpj" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Tenant" ADD COLUMN "deletedAt" DATETIME;
CREATE UNIQUE INDEX "Tenant_cnpj_key" ON "Tenant"("cnpj");

-- User
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "fullName" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "profilePhoto" TEXT;
ALTER TABLE "User" ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME;
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Membership
ALTER TABLE "Membership" ADD COLUMN "deletedAt" DATETIME;
