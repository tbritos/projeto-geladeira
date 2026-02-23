-- CreateTable
CREATE TABLE "Reading" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT NOT NULL,
    "temperature" REAL NOT NULL,
    "humidity" REAL NOT NULL,
    "relayState" BOOLEAN NOT NULL DEFAULT false,
    "doorOpen" BOOLEAN NOT NULL DEFAULT false,
    "powerOk" BOOLEAN NOT NULL DEFAULT true
);
