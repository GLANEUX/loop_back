import { Test } from "@nestjs/testing";
import type { Request } from "express";
import { AuthGuard } from "@modules/auth/auth.guard";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

describe("UsersController", () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            softDeleteById: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = moduleRef.get(UsersController);
    usersService = moduleRef.get(UsersService);
  });

  it("returns current user", () => {
    const request = { user: { id: "user-1", email: "test@loop.local", role: "user" } } as Request;
    expect(controller.getMe(request)).toEqual(request.user);
  });

  it("soft deletes current user", async () => {
    const request = { user: { id: "user-1" } } as Request;
    const result = await controller.softDeleteMe(request);
    expect(usersService.softDeleteById).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({ ok: true });
  });
});
