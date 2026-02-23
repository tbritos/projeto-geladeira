PRAGMA foreign_keys=OFF;

-- CreateTable Tenant
CREATE TABLE "Tenant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable User
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "platformRole" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable Membership
CREATE TABLE "Membership" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable Device
CREATE TABLE "Device" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tenantId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Device_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "Tenant" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES (1, 'Cliente Padrao', 'default', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Device" ("id", "tenantId", "externalId", "name", "isActive", "createdAt", "updatedAt")
VALUES (1, 1, 'tupa-01', 'Dispositivo Padrao', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Rebuild Reading with tenantId and deviceId
ALTER TABLE "Reading" RENAME TO "Reading_old";

CREATE TABLE "Reading" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature" REAL NOT NULL,
    "humidity" REAL NOT NULL,
    "relayState" BOOLEAN NOT NULL DEFAULT false,
    "doorOpen" BOOLEAN NOT NULL DEFAULT false,
    "powerOk" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" INTEGER NOT NULL,
    "deviceId" INTEGER,
    CONSTRAINT "Reading_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "Reading" ("id", "createdAt", "temperature", "humidity", "relayState", "doorOpen", "powerOk", "tenantId", "deviceId")
SELECT "id", "createdAt", "temperature", "humidity", "relayState", "doorOpen", "powerOk", 1, 1
FROM "Reading_old";

DROP TABLE "Reading_old";

-- Rebuild TemperatureSetting with tenantId
ALTER TABLE "TemperatureSetting" RENAME TO "TemperatureSetting_old";

CREATE TABLE "TemperatureSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tenantId" INTEGER NOT NULL,
    "minTemp" REAL NOT NULL,
    "maxTemp" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TemperatureSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "TemperatureSetting" ("tenantId", "minTemp", "maxTemp", "createdAt", "updatedAt")
SELECT 1, "minTemp", "maxTemp", "createdAt", "updatedAt"
FROM "TemperatureSetting_old";

DROP TABLE "TemperatureSetting_old";

INSERT INTO "TemperatureSetting" ("tenantId", "minTemp", "maxTemp", "createdAt", "updatedAt")
SELECT 1, 2.0, 8.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "TemperatureSetting" WHERE "tenantId" = 1
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "Membership"("userId", "tenantId");
CREATE UNIQUE INDEX "Device_externalId_key" ON "Device"("externalId");
CREATE INDEX "Reading_tenantId_createdAt_idx" ON "Reading"("tenantId", "createdAt");
CREATE UNIQUE INDEX "TemperatureSetting_tenantId_key" ON "TemperatureSetting"("tenantId");

PRAGMA foreign_keys=ON;
