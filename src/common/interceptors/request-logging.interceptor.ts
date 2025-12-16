import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const { method, url } = request;
    const started = Date.now();

    this.logger.log(`REQ ${method} ${url}`);

    return next.handle().pipe(
      tap(() => this.logger.log(`RES ${method} ${url} ${Date.now() - started}ms`)),
      catchError((err) => {
        this.logger.error(
          `ERR ${method} ${url} ${err?.message ?? 'unknown'}`,
          err?.stack,
        );
        throw err;
      }),
    );
  }
}
