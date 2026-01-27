import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { Request } from "express";
import { ZodError } from "zod";

type ErrorResponseBody = {
  statusCode: number;
  message: unknown;
  error?: string;
  timestamp: string;
  path: string;
  requestId?: string;
};

@Catch()
@Injectable()
export class AllExceptionsFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const response = ctx.getResponse();

    const isZodError = exception instanceof ZodError;
    const isHttpException = exception instanceof HttpException;
    const statusCode = isZodError
      ? HttpStatus.BAD_REQUEST
      : isHttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const normalized = isZodError
      ? { message: this.formatZodError(exception), error: "Bad Request" }
      : this.normalizeExceptionResponse(isHttpException ? exception.getResponse() : undefined);

    const body: ErrorResponseBody = {
      statusCode,
      message: normalized.message ?? this.defaultMessageForStatus(statusCode),
      error: normalized.error ?? this.defaultErrorForStatus(statusCode),
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      requestId: request.requestId,
    };

    this.logger.debug(
      `Handled exception (${statusCode}) for ${request.method} ${request.url} [${request.requestId ?? "no-request-id"}]`,
    );

    if (!isHttpException && !isZodError) {
      const errorToLog = exception instanceof Error ? exception.stack ?? exception.message : exception;
      this.logger.error(
        `Unhandled exception for ${request.method} ${request.url} [${request.requestId ?? "no-request-id"}]`,
        typeof errorToLog === "string" ? errorToLog : JSON.stringify(errorToLog),
      );
    }

    httpAdapter.reply(response, body, statusCode);
  }

  private normalizeExceptionResponse(
    response: string | object | undefined,
  ): { message?: unknown; error?: string } {
    if (typeof response === "string") {
      return { message: response };
    }

    if (!response || typeof response !== "object") {
      return {};
    }

    const maybeMessage = "message" in response ? response.message : undefined;
    const maybeError = "error" in response && typeof response.error === "string" ? response.error : undefined;

    if (maybeMessage !== undefined) {
      return { message: maybeMessage, error: maybeError };
    }

    // Some callers (like z.treeifyError) return a structured object without a `message` field.
    // In that case we surface the full object under `message` so the global envelope still applies.
    return { message: response, error: maybeError };
  }

  private formatZodError(error: ZodError): { issues: Array<{ path: string; message: string }> } {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return { issues };
  }

  private defaultMessageForStatus(statusCode: number): string {
    if (statusCode >= 500) {
      return "Internal server error";
    }
    return "Request failed";
  }

  private defaultErrorForStatus(statusCode: number): string {
    const label = HttpStatus[statusCode];
    return typeof label === "string" ? this.toTitleCase(label) : "Error";
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}
