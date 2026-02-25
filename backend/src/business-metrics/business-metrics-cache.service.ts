import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppLoggerService } from '../common/logger/app-logger.service';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class BusinessMetricsCacheService {
  private readonly memoryCache = new Map<string, MemoryEntry>();
  private readonly memoryVersion = new Map<string, number>();
  private redisUnavailableLogged = false;

  constructor(
    @InjectQueue('workflows') private readonly workflowQueue: Queue,
    private readonly logger: AppLoggerService,
  ) {}

  async getOrSet<T>(params: {
    organizationId: string;
    scope: string;
    keyPart: string;
    ttlSeconds: number;
    resolver: () => Promise<T>;
  }): Promise<T> {
    const version = await this.getOrganizationCacheVersion(params.organizationId);
    const cacheKey = `metrics:${params.organizationId}:${params.scope}:v${version}:${params.keyPart}`;
    const cached = await this.getJson<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const computed = await params.resolver();
    await this.setJson(cacheKey, computed, params.ttlSeconds);
    return computed;
  }

  async bumpOrganizationCacheVersion(organizationId: string): Promise<void> {
    const key = this.versionKey(organizationId);
    const redis = await this.getRedisClient();
    if (redis) {
      try {
        await redis.incr(key);
        return;
      } catch (error) {
        this.logRedisFallback(error);
      }
    }

    const nextVersion = (this.memoryVersion.get(key) || 0) + 1;
    this.memoryVersion.set(key, nextVersion);
  }

  private async getOrganizationCacheVersion(organizationId: string): Promise<number> {
    const key = this.versionKey(organizationId);
    const redis = await this.getRedisClient();
    if (redis) {
      try {
        const value = await redis.get(key);
        return value ? Number(value) || 0 : 0;
      } catch (error) {
        this.logRedisFallback(error);
      }
    }

    return this.memoryVersion.get(key) || 0;
  }

  private async getJson<T>(key: string): Promise<T | null> {
    const redis = await this.getRedisClient();
    if (redis) {
      try {
        const value = await redis.get(key);
        if (!value) {
          return null;
        }
        return JSON.parse(value) as T;
      } catch (error) {
        this.logRedisFallback(error);
      }
    }

    const memory = this.memoryCache.get(key);
    if (!memory) {
      return null;
    }
    if (Date.now() > memory.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return JSON.parse(memory.value) as T;
  }

  private async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const payload = JSON.stringify(value);
    const redis = await this.getRedisClient();
    if (redis) {
      try {
        await redis.set(key, payload, 'EX', ttlSeconds);
        return;
      } catch (error) {
        this.logRedisFallback(error);
      }
    }

    this.memoryCache.set(key, {
      value: payload,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private versionKey(organizationId: string): string {
    return `metrics:${organizationId}:version`;
  }

  private async getRedisClient() {
    try {
      return await this.workflowQueue.client;
    } catch (error) {
      this.logRedisFallback(error);
      return null;
    }
  }

  private logRedisFallback(error: unknown) {
    if (this.redisUnavailableLogged) {
      return;
    }
    this.redisUnavailableLogged = true;
    this.logger.warn('Business metrics cache is using in-memory fallback', {
      service: 'business-metrics-cache',
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
