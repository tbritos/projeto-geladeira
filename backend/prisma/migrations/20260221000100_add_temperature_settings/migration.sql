-- CreateTable
CREATE TABLE "TemperatureSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "minTemp" REAL NOT NULL,
    "maxTemp" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
