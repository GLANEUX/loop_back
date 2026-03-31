import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { Test } from "@nestjs/testing";
import { MediaController } from "./media.controller";
import { UsersService } from "./users.service";
import { AuthGuard } from "@modules/auth/auth.guard";
import { ProfileMediaType } from "./profile-media.entity";
import { BadRequestException } from "@nestjs/common";

describe("MediaController", () => {
  let controller: MediaController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockUsersService = {
      listProfileMedia: jest.fn(),
      addProfileMedia: jest.fn(),
      getProfileMedia: jest.fn(),
      deleteProfileMedia: jest.fn(),
      setFeaturedAudio: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => Promise.resolve(true)) })
      .compile();

    controller = moduleRef.get(MediaController);
    usersService = moduleRef.get(UsersService);
  });

  describe("uploadMedia", () => {
    const mockFile = {
      buffer: Buffer.from("fake"),
      mimetype: "image/png",
      size: 1024,
    } as Express.Multer.File;

    it("uploads a media correctly", async () => {
      const req = { user: { id: "u1" } } as any;
      usersService.addProfileMedia.mockResolvedValueOnce({
        id: "m1",
        type: ProfileMediaType.Image,
        title: "Title",
        mimeType: "image/png",
        order: 0,
        createdAt: new Date(),
      } as any);

      const result = await controller.uploadMedia(
        mockFile,
        ProfileMediaType.Image,
        "Title",
        "true",
        "false",
        req,
      );

      expect(usersService.addProfileMedia).toHaveBeenCalledWith(
        "u1",
        mockFile.buffer,
        mockFile.mimetype,
        ProfileMediaType.Image,
        "Title",
        { isAvatar: true, isFeatured: false },
      );
      expect(result.id).toBe("m1");
    });

    it("throws error if file is missing", async () => {
      const req = { user: { id: "u1" } } as any;
      await expect(
        controller.uploadMedia(
          undefined as any,
          ProfileMediaType.Image,
          "Title",
          "false",
          "false",
          req,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws error if mime type is invalid for type", async () => {
      const req = { user: { id: "u1" } } as any;
      const invalidFile = { ...mockFile, mimetype: "application/pdf" } as any;

      await expect(
        controller.uploadMedia(
          invalidFile,
          ProfileMediaType.Image,
          "Title",
          "false",
          "false",
          req,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getMedia", () => {
    it("returns media data", async () => {
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as any;
      usersService.getProfileMedia.mockResolvedValueOnce({
        data: Buffer.from("data"),
        mimeType: "image/png",
      } as any);

      await controller.getMedia("m1", res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  describe("deleteMedia", () => {
    it("deletes media correctly", async () => {
      const req = { user: { id: "u1" } } as any;
      usersService.deleteProfileMedia.mockResolvedValueOnce({ ok: true });

      const result = await controller.deleteMedia("m1", req);

      expect(usersService.deleteProfileMedia).toHaveBeenCalledWith("u1", "m1");
      expect(result.ok).toBe(true);
    });
  });

  describe("Featured Audio", () => {
    it("sets featured audio", async () => {
      const req = { user: { id: "u1" } } as any;
      usersService.setFeaturedAudio.mockResolvedValueOnce({ ok: true } as any);

      const result = await controller.setFeaturedAudio("m1", req);

      expect(usersService.setFeaturedAudio).toHaveBeenCalledWith("u1", "m1");
      expect(result.ok).toBe(true);
    });

    it("unsets featured audio", async () => {
      const req = { user: { id: "u1" } } as any;
      usersService.setFeaturedAudio.mockResolvedValueOnce({ ok: true } as any);

      const result = await controller.unsetFeaturedAudio(req);

      expect(usersService.setFeaturedAudio).toHaveBeenCalledWith("u1", null);
      expect(result.ok).toBe(true);
    });
  });
});
