import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { Request, Response } from "express";
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
    const response = ctx.getResponse<Response>();

    const isZodError = exception instanceof ZodError;
    const isHttpException = exception instanceof HttpException;
    const statusCode = isZodError
      ? HttpStatus.BAD_REQUEST
      : isHttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const normalized = isZodError
      ? { message: this.formatZodError(exception), error: "Requête invalide" }
      : this.normalizeExceptionResponse(isHttpException ? exception.getResponse() : undefined);

    const body: ErrorResponseBody = {
      statusCode,
      message: normalized.message ?? this.defaultMessageForStatus(statusCode),
      error: normalized.error ?? this.defaultErrorForStatus(statusCode),
      timestamp: new Date().toISOString(),
      path: String(httpAdapter.getRequestUrl(request)),
      requestId: request.requestId,
    };

    this.logger.debug(
      `Handled exception (${statusCode}) for ${request.method} ${request.url} [${request.requestId ?? "no-request-id"}]`,
    );

    if (!isHttpException && !isZodError) {
      const errorToLog =
        exception instanceof Error ? (exception.stack ?? exception.message) : exception;
      this.logger.error(
        `Unhandled exception for ${request.method} ${request.url} [${request.requestId ?? "no-request-id"}]`,
        typeof errorToLog === "string" ? errorToLog : JSON.stringify(errorToLog),
      );
    }

    httpAdapter.reply(response, body, statusCode);
  }

  private normalizeExceptionResponse(response: string | object | undefined): {
    message?: unknown;
    error?: string;
  } {
    if (typeof response === "string") {
      return { message: response };
    }

    if (!response || typeof response !== "object") {
      return {};
    }

    const maybeMessage = "message" in response ? response.message : undefined;
    const maybeError = "error" in response ? response.error : undefined;

    if (maybeMessage !== undefined || maybeError !== undefined) {
      return {
        message: maybeMessage,
        error: typeof maybeError === "string" ? maybeError : undefined,
      };
    }

    // Some callers (like z.treeifyError) return a structured object without a `message` field.
    // In that case we surface the full object under `message` so the global envelope still applies.
    return { message: response };
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
      return "Erreur interne du serveur";
    }
    return "La requête a échoué";
  }

  private defaultErrorForStatus(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return "Requête invalide";
      case HttpStatus.UNAUTHORIZED:
        return "Non autorisé";
      case HttpStatus.FORBIDDEN:
        return "Interdit";
      case HttpStatus.NOT_FOUND:
        return "Introuvable";
      case HttpStatus.CONFLICT:
        return "Conflit";
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return "Entité non traitable";
      case HttpStatus.TOO_MANY_REQUESTS:
        return "Trop de requêtes";
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return "Erreur interne du serveur";
      default:
        return "Erreur";
    }
  }
}
