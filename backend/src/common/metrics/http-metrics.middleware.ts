import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { RequestWithContext } from '../interfaces/request-context.interface';
import { WorkflowMetrics } from './workflow.metrics';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly workflowMetrics: WorkflowMetrics) {}

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const endTimer = this.workflowMetrics.httpRequestDurationSeconds.startTimer({
      method: req.method,
      route: req.route?.path ?? req.path,
      status_code: 'pending',
    });

    res.on('finish', () => {
      endTimer({
        method: req.method,
        route: req.route?.path ?? req.path,
        status_code: String(res.statusCode),
      });
    });

    next();
  }
}
