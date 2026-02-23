import type { FastifyRequest } from 'fastify';
import { appendFile, readFile } from 'node:fs/promises';
import { AUDIT_LOG_PATH } from '../config/env';
import type { AuditLogEntry } from '../shared/types';

const createAuditId = () => `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getRequestIp = (request: FastifyRequest) => {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim();
  }
  return request.ip;
};

export const writeAuditLog = async (
  request: FastifyRequest,
  input: Omit<AuditLogEntry, 'id' | 'timestamp' | 'ip' | 'userAgent'>
) => {
  const entry: AuditLogEntry = {
    ...input,
    id: createAuditId(),
    timestamp: new Date().toISOString(),
    ip: getRequestIp(request),
    userAgent: String(request.headers['user-agent'] ?? ''),
  };
  try {
    await appendFile(AUDIT_LOG_PATH, `${JSON.stringify(entry)}\n`, 'utf-8');
  } catch (error) {
    request.log.error({ error }, 'Falha ao escrever audit.log');
  }
};

export const readAuditLogs = async (): Promise<AuditLogEntry[]> => {
  try {
    const content = await readFile(AUDIT_LOG_PATH, 'utf-8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditLogEntry)
      .filter((entry) => entry && entry.id && entry.timestamp && entry.action);
  } catch {
    return [];
  }
};
