import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface CorrelationContext {
  correlationId: string;
  organizationId?: string;
  userId?: string;
}

@Injectable()
export class CorrelationContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<CorrelationContext>();

  runWithContext<T>(context: CorrelationContext, callback: () => T): T {
    return this.asyncLocalStorage.run({ ...context }, callback);
  }

  getStore(): CorrelationContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  getCorrelationId(): string | undefined {
    return this.getStore()?.correlationId;
  }

  setOrganizationId(organizationId: string): void {
    const store = this.getStore();
    if (!store) {
      return;
    }
    store.organizationId = organizationId;
  }

  setUserId(userId: string): void {
    const store = this.getStore();
    if (!store) {
      return;
    }
    store.userId = userId;
  }
}
