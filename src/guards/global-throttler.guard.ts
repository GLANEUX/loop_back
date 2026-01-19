import { Injectable, type ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class GlobalThrottlerGuard extends ThrottlerGuard {
  protected shouldSkip(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path = request?.path ?? request?.url ?? "";
    if (path.startsWith("/health") || path.startsWith("/docs")) {
      return true;
    }

    return super.shouldSkip(context);
  }
}
