# API Documentation - Projeto Geladeira (Multi-tenant)

Base URL (local): `http://localhost:3333`

API prefix: `/api`

## Fluxo Recomendado de Criacao (UI Admin)

1. Entrar como super admin.
2. Ir em `Admin > Clientes`.
3. Criar organizacao e, no mesmo fluxo/transacao, criar o primeiro usuario (`OWNER` ou `TENANT_ADMIN`).
4. Abrir a organizacao e adicionar/gerenciar usuarios no bloco de usuarios dela.

## Auth

### POST `/api/auth/login`
Full URL: `http://localhost:3333/api/auth/login`

Body:
```json
{
  "username": "admin",
  "password": "admin",
  "tenantSlug": "default"
}
```

Notes:
- `tenantSlug` is optional (if omitted, first membership tenant is used).

Response (200):
```json
{
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "user": {
    "username": "admin",
    "role": "admin",
    "platformRole": "SUPER_ADMIN",
    "tenantRole": "TENANT_ADMIN",
    "tenantId": 1
  },
  "organizations": [
    {
      "tenantId": 1,
      "tenantName": "Cliente Padrao",
      "tenantSlug": "default",
      "role": "TENANT_ADMIN"
    }
  ]
}
```

### POST `/api/auth/refresh`
Full URL: `http://localhost:3333/api/auth/refresh`

Body:
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

Response (200):
```json
{
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

### POST `/api/auth/logout`
Full URL: `http://localhost:3333/api/auth/logout`

Body (optional):
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

Response (200):
```json
{
  "success": true
}
```

### POST `/api/auth/switch-organization`
Full URL: `http://localhost:3333/api/auth/switch-organization`

Headers:
- `Authorization: Bearer <accessToken>` (usuario comum)

Body:
```json
{
  "tenantId": 2
}
```

Response (200):
```json
{
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token",
  "user": {
    "username": "joao",
    "role": "operador",
    "platformRole": "USER",
    "tenantRole": "OPERATOR",
    "tenantId": 2
  },
  "organizations": [
    {
      "tenantId": 1,
      "tenantName": "Cliente Padrao",
      "tenantSlug": "default",
      "role": "VIEWER"
    },
    {
      "tenantId": 2,
      "tenantName": "Cliente ACME",
      "tenantSlug": "acme",
      "role": "OPERATOR"
    }
  ]
}
```

### GET `/api/auth/me`
Full URL: `http://localhost:3333/api/auth/me`

Headers:
- `Authorization: Bearer <accessToken>`

Response (200):
```json
{
  "user": {
    "username": "admin",
    "role": "admin",
    "platformRole": "SUPER_ADMIN",
    "tenantRole": "TENANT_ADMIN",
    "tenantId": 1
  },
  "organizations": [
    {
      "tenantId": 1,
      "tenantName": "Cliente Padrao",
      "tenantSlug": "default",
      "role": "TENANT_ADMIN"
    }
  ]
}
```

### POST `/api/auth/impersonate`
Full URL: `http://localhost:3333/api/auth/impersonate`

Headers:
- `Authorization: Bearer <accessToken>` (deve ser super admin)

Body:
```json
{
  "username": "joao",
  "tenantId": 2
}
```

Response (200):
```json
{
  "accessToken": "jwt_access_token_impersonado",
  "refreshToken": "jwt_refresh_token_impersonado",
  "user": {
    "username": "joao",
    "role": "operador",
    "platformRole": "USER",
    "tenantRole": "OPERATOR",
    "tenantId": 2,
    "impersonatedBy": "admin"
  },
  "organizations": [
    {
      "tenantId": 2,
      "tenantName": "Cliente ACME",
      "tenantSlug": "acme",
      "role": "OPERATOR"
    }
  ]
}
```

## Platform (Super Admin)

### GET `/api/platform/tenants`
Full URL: `http://localhost:3333/api/platform/tenants`

Headers:
- `Authorization: Bearer <accessToken>`

Query params:
- `includeDeleted=true` para listar tambem organizacoes arquivadas.

Response (200):
```json
[
  {
    "id": 1,
    "name": "Cliente Padrao",
    "slug": "default",
    "isActive": true,
    "createdAt": "2026-02-21T00:00:00.000Z",
    "updatedAt": "2026-02-21T00:00:00.000Z",
    "_count": {
      "readings": 10,
      "devices": 1,
      "users": 2
    }
  }
]
```

### POST `/api/platform/tenants`
Full URL: `http://localhost:3333/api/platform/tenants`

Headers:
- `Authorization: Bearer <accessToken>`

Body:
```json
{
  "name": "ACME",
  "tradeName": "ACME Tecnologia",
  "legalName": "ACME Tecnologia LTDA",
  "cnpj": "12.345.678/0001-99",
  "slug": "acme",
  "accountStatus": "ACTIVE",
  "owner": {
    "username": "owner.acme",
    "fullName": "Responsavel ACME",
    "email": "owner@acme.com",
    "phone": "+55 11 99999-9999",
    "password": "1234",
    "role": "OWNER"
  }
}
```

Response (200):
```json
{
  "id": 2,
  "name": "ACME",
  "tradeName": "ACME Tecnologia",
  "legalName": "ACME Tecnologia LTDA",
  "cnpj": "12.345.678/0001-99",
  "slug": "acme",
  "accountStatus": "ACTIVE",
  "deletedAt": null,
  "isActive": true,
  "createdAt": "2026-02-21T00:00:00.000Z",
  "updatedAt": "2026-02-21T00:00:00.000Z"
}
```

### POST `/api/platform/tenants/:tenantId/archive`
Full URL example: `http://localhost:3333/api/platform/tenants/2/archive`

Headers:
- `Authorization: Bearer <accessToken>` (super admin)

Resposta: retorna a organizacao com `deletedAt` preenchido e `accountStatus=CANCELLED`.

### POST `/api/platform/tenants/:tenantId/restore`
Full URL example: `http://localhost:3333/api/platform/tenants/2/restore`

Headers:
- `Authorization: Bearer <accessToken>` (super admin)

Resposta: retorna a organizacao restaurada com `deletedAt=null`.

### GET `/api/platform/audit`
Full URL: `http://localhost:3333/api/platform/audit`

Headers:
- `Authorization: Bearer <accessToken>` (deve ser super admin)

Query params (todos opcionais):
- `tenantId`: number
- `actorUsername`: string
- `action`: string (ex: `AUTH_IMPERSONATE`)
- `from`: ISO date
- `to`: ISO date
- `limit`: 1..500

Response (200):
```json
[
  {
    "id": "audit_1740099999999_ab12cd",
    "timestamp": "2026-02-21T18:00:00.000Z",
    "action": "AUTH_IMPERSONATE",
    "actorUsername": "admin",
    "actorPlatformRole": "SUPER_ADMIN",
    "actorTenantRole": "TENANT_ADMIN",
    "actorTenantId": 1,
    "targetUsername": "joao",
    "targetTenantId": 2,
    "ip": "::1",
    "userAgent": "Mozilla/5.0 ...",
    "metadata": {
      "targetRole": "OPERATOR"
    }
  }
]
```

## Tenant Users

### GET `/api/tenant/users`
Full URL: `http://localhost:3333/api/tenant/users`

Headers:
- `Authorization: Bearer <accessToken>`
- `x-tenant-id: <tenantId>` (optional; mainly for SUPER_ADMIN)

Query params:
- `includeDeleted=true` para listar tambem vinculacoes removidas.

Response (200):
```json
[
  {
    "membershipId": 1,
    "membershipDeletedAt": null,
    "role": "TENANT_ADMIN",
    "tenantId": 1,
    "user": {
      "id": 1,
      "username": "admin",
      "displayName": "admin",
      "platformRole": "SUPER_ADMIN",
      "isActive": true,
      "createdAt": "2026-02-21T00:00:00.000Z",
      "updatedAt": "2026-02-21T00:00:00.000Z"
    }
  }
]
```

### POST `/api/tenant/users`
Full URL: `http://localhost:3333/api/tenant/users`

Headers:
- `Authorization: Bearer <accessToken>`
- `x-tenant-id: <tenantId>` (optional; mainly for SUPER_ADMIN)

Body:
```json
{
  "username": "joao",
  "email": "joao@acme.com",
  "fullName": "Joao Silva",
  "phone": "+55 11 98888-7777",
  "password": "1234",
  "displayName": "Joao Silva",
  "status": "ACTIVE",
  "role": "OPERATOR"
}
```

Response (200):
```json
{
  "membershipId": 8,
  "role": "OPERATOR",
  "tenantId": 2,
  "user": {
    "id": 5,
    "username": "joao",
    "email": "joao@acme.com",
    "fullName": "Joao Silva",
    "displayName": "Joao Silva",
    "phone": "+55 11 98888-7777",
    "accountStatus": "ACTIVE",
    "lastLoginAt": null,
    "deletedAt": null,
    "platformRole": "USER",
    "isActive": true,
    "createdAt": "2026-02-21T00:00:00.000Z",
    "updatedAt": "2026-02-21T00:00:00.000Z"
  }
}
```

### PUT `/api/tenant/users/:userId/role`
Full URL example: `http://localhost:3333/api/tenant/users/5/role`

Headers:
- `Authorization: Bearer <accessToken>`
- `x-tenant-id: <tenantId>` (optional; mainly for SUPER_ADMIN)

Body:
```json
{
  "role": "TENANT_ADMIN"
}
```

Response (200): same shape as `POST /api/tenant/users`.

### POST `/api/tenant/users/:userId/archive`
Full URL example: `http://localhost:3333/api/tenant/users/5/archive`

Headers:
- `Authorization: Bearer <accessToken>`
- `x-tenant-id: <tenantId>` (optional; mainly for SUPER_ADMIN)

Efeito: remove o usuario da organizacao por soft delete da membership (`membershipDeletedAt`).

### POST `/api/tenant/users/:userId/restore`
Full URL example: `http://localhost:3333/api/tenant/users/5/restore`

Headers:
- `Authorization: Bearer <accessToken>`
- `x-tenant-id: <tenantId>` (optional; mainly for SUPER_ADMIN)

Efeito: restaura a membership do usuario dentro da organizacao.

## Device Readings (Ingestion)

### POST `/api/readings`
Full URL: `http://localhost:3333/api/readings`

Auth: no bearer token required (device ingestion endpoint).

Body:
```json
{
  "deviceId": "tupa-01",
  "temperature": 6.4,
  "humidity": 53,
  "relayState": false,
  "doorOpen": false,
  "powerOk": true
}
```

Response (200): created reading record.

## Monitoring

All endpoints below require:
- `Authorization: Bearer <accessToken>`
- `x-tenant-id: <tenantId>` (optional for SUPER_ADMIN; normal users use their own tenant automatically)

### GET `/api/status`
Full URL: `http://localhost:3333/api/status`

Response (200):
```json
{
  "temperature": 6.4,
  "humidity": 53,
  "relayState": false,
  "door1Status": true,
  "powerStatus": true,
  "minTemp": 2,
  "maxTemp": 8,
  "alertActive": false,
  "lastUpdate": "2026-02-21T00:00:00.000Z",
  "tenantId": 1,
  "tenantName": "Cliente Padrao"
}
```

### GET `/api/history`
Full URL: `http://localhost:3333/api/history`

Response (200):
```json
[
  { "time": "10:00", "temperature": 5.2, "humidity": 52 },
  { "time": "10:02", "temperature": 5.3, "humidity": 53 }
]
```

### GET `/api/events`
Full URL: `http://localhost:3333/api/events`

Response (200):
```json
[
  {
    "id": "tenant-1-reading-10-temp-high",
    "type": "ALERT",
    "message": "Temperatura acima do limite (9.2C)",
    "timestamp": "2026-02-21T00:00:00.000Z",
    "severity": "critical"
  }
]
```

## Temperature Settings

### GET `/api/settings/temperature`
Full URL: `http://localhost:3333/api/settings/temperature`

Headers:
- `Authorization: Bearer <accessToken>`
- `x-tenant-id: <tenantId>` (optional for SUPER_ADMIN)

Response (200):
```json
{
  "id": 3,
  "tenantId": 1,
  "minTemp": 2,
  "maxTemp": 8,
  "createdAt": "2026-02-21T00:00:00.000Z",
  "updatedAt": "2026-02-21T00:00:00.000Z"
}
```

### PUT `/api/settings/temperature`
Full URL: `http://localhost:3333/api/settings/temperature`

Headers:
- `Authorization: Bearer <accessToken>`
- `x-tenant-id: <tenantId>` (optional for SUPER_ADMIN)

Body:
```json
{
  "minTemp": 2.5,
  "maxTemp": 7.5
}
```

Response (200): same shape as GET.

---

## HTTP Status / Errors (common)
- `400`: invalid body/params
- `401`: token missing/invalid/expired
- `403`: no permission for route or tenant context
- `500`: internal server error

## Quick Test Links (browser/curl)
- `GET http://localhost:3333/api/auth/me` (needs bearer)
- `GET http://localhost:3333/api/platform/tenants` (super admin)
- `GET http://localhost:3333/api/status` (tenant-scoped)
