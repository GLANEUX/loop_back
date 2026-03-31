import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Request } from "express";
import { AuthGuard } from "@modules/auth/auth.guard";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";

describe("DiscoveryController", () => {
  let controller: DiscoveryController;
  let discoveryService: jest.Mocked<DiscoveryService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DiscoveryController],
      providers: [
        {
          provide: DiscoveryService,
          useValue: {
            getQueue: jest.fn(),
            swipe: jest.fn(),
            listSwipes: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = moduleRef.get(DiscoveryController);
    discoveryService = moduleRef.get(DiscoveryService);
  });

  it("validates swipe payloads", async () => {
    const request = { user: { id: "user-1" } } as Request;

    await expect(
      controller.swipe({ targetProfileId: "not-uuid", isLike: true }, request),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("calls discovery service for swipes", async () => {
    const request = { user: { id: "user-1" } } as Request;
    discoveryService.swipe.mockResolvedValueOnce({ swipeId: "swipe-1" } as any);

    await controller.swipe(
      { targetProfileId: "550e8400-e29b-41d4-a716-446655440000", isLike: true },
      request,
    );

    expect(discoveryService.swipe).toHaveBeenCalledWith(
      "user-1",
      "550e8400-e29b-41d4-a716-446655440000",
      true,
    );
  });

  it("rejects invalid queue limit", async () => {
    const request = { user: { id: "user-1" } } as Request;

    await expect(controller.getQueue(request, "0")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("calls discovery service for likes/dislikes", async () => {
    const request = { user: { id: "user-1" } } as Request;
    discoveryService.listSwipes.mockResolvedValue([]);

    await controller.listLikes(request);

    expect(discoveryService.listSwipes).toHaveBeenCalledWith("user-1", true);

    await controller.listDislikes(request);

    expect(discoveryService.listSwipes).toHaveBeenCalledWith("user-1", false);
  });
});
