import { HttpException, HttpStatus } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ZodError, z } from "zod";
import { AllExceptionsFilter } from "./all-exceptions.filter";

describe("AllExceptionsFilter", () => {
  const createHost = (requestOverrides?: Partial<{ url: string; method: string; requestId?: string }>) => {
    const request = {
      url: "/test",
      method: "GET",
      requestId: "req-1",
      ...requestOverrides,
    };
    const response = {};
    const httpAdapter = {
      getRequestUrl: jest.fn().mockReturnValue("/test"),
      reply: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as any;

    return { request, response, httpAdapter, host };
  };

  const createFilter = (httpAdapter: { getRequestUrl: jest.Mock; reply: jest.Mock }) =>
    new AllExceptionsFilter({ httpAdapter } as unknown as HttpAdapterHost);

  it("handles ZodError with 400 and formatted issues", () => {
    const { httpAdapter, host } = createHost();
    const filter = createFilter(httpAdapter);

    let zodError: ZodError;
    try {
      z.object({ name: z.string() }).parse({ name: 123 });
    } catch (error) {
      zodError = error as ZodError;
    }

    filter.catch(zodError!, host);

    expect(httpAdapter.reply).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        error: "Bad Request",
        message: {
          issues: [{ path: "name", message: expect.any(String) }],
        },
        path: "/test",
        requestId: "req-1",
        timestamp: expect.any(String),
      }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it("handles HttpException with string response", () => {
    const { httpAdapter, host } = createHost();
    const filter = createFilter(httpAdapter);
    const exception = new HttpException("Nope", HttpStatus.FORBIDDEN);

    filter.catch(exception, host);

    expect(httpAdapter.reply).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Nope",
        error: "Forbidden",
      }),
      HttpStatus.FORBIDDEN,
    );
  });

  it("handles HttpException with object response without message", () => {
    const { httpAdapter, host } = createHost();
    const filter = createFilter(httpAdapter);
    const exception = new HttpException({ foo: "bar" }, HttpStatus.UNPROCESSABLE_ENTITY);

    filter.catch(exception, host);

    expect(httpAdapter.reply).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: { foo: "bar" },
        error: "Unprocessable Entity",
      }),
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });

  it("handles unknown errors with 500 and defaults", () => {
    const { httpAdapter, host } = createHost({ requestId: undefined });
    const filter = createFilter(httpAdapter);
    const exception = new Error("boom");

    filter.catch(exception, host);

    expect(httpAdapter.reply).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
        error: "Internal Server Error",
        requestId: undefined,
      }),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });
});
