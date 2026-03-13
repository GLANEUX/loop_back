import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { Test } from "@nestjs/testing";
import { MediaController } from "./media.controller";
import { UsersService } from "./users.service";
import { AuthGuard } from "@modules/auth/auth.guard";
import { ProfileMediaType } from "./profile-media.entity";
import { BadRequestException } from "@nestjs/common";
import { Response } from "express";

describe("MediaController", () => {
  let controller: MediaController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockUsersService = {
      listProfileMedia: jest.fn(),
      addProfileMedia: jest.fn(),
      getProfileMedia: jest.fn(),
      deleteProfileMedia: jest.fn(),
      getAvatarForUser: jest.fn(),
      getAvatarForProfile: jest.fn(),
      getProfileForUser: jest.fn(),
      deleteAvatar: jest.fn(),
      getFeaturedAudioForProfile: jest.fn(),
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
    usersService = moduleRef.get(UsersService) as any;
  });

  describe("Upload Endpoints", () => {
    const mockFile = {
      buffer: Buffer.from("fake"),
      mimetype: "image/png",
      size: 1024,
    } as Express.Multer.File;

    it("uploads an image correctly", async () => {
      const req = { user: { id: "u1" } } as any;
      usersService.addProfileMedia.mockResolvedValueOnce({ id: "m1", type: ProfileMediaType.Image } as any);

      const result = await controller.uploadImage(req, mockFile, "Title", "true");

      expect(usersService.addProfileMedia).toHaveBeenCalledWith(
        "u1",
        mockFile.buffer,
        mockFile.mimetype,
        ProfileMediaType.Image,
        "Title",
        { isAvatar: true },
      );
      expect(result.id).toBe("m1");
    });

    it("throws error if file type is invalid for audio", async () => {
      const req = { user: { id: "u1" } } as any;
      const invalidFile = { ...mockFile, mimetype: "image/png" } as any;

      await expect(controller.uploadAudio(req, invalidFile)).rejects.toThrow(BadRequestException);
    });

    it("throws error if file is too large for image", async () => {
      const req = { user: { id: "u1" } } as any;
      const largeFile = { ...mockFile, size: 10 * 1024 * 1024 } as any; // 10MB > 5MB limit

      await expect(controller.uploadImage(req, largeFile)).rejects.toThrow(BadRequestException);
    });
  });

  describe("Avatar Endpoints", () => {
    it("returns avatar data for a profile", async () => {
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as any;
      usersService.getAvatarForProfile.mockResolvedValueOnce({ data: Buffer.from("data"), mimeType: "image/png" } as any);

      await controller.getProfileAvatar("p1", res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it("deletes avatar via specific endpoint", async () => {
      const req = { user: { id: "u1" } } as any;
      usersService.deleteAvatar.mockResolvedValueOnce({ ok: true });

      const result = await controller.deleteAvatar(req);

      expect(usersService.deleteAvatar).toHaveBeenCalledWith("u1");
      expect(result.ok).toBe(true);
    });
  });

  describe("Featured Audio Endpoints", () => {
    it("sets featured audio ID", async () => {
      const req = { user: { id: "u1" } } as any;
      usersService.setFeaturedAudio.mockResolvedValueOnce({ ok: true });

      const result = await controller.setFeaturedAudio(req, "m1");

      expect(usersService.setFeaturedAudio).toHaveBeenCalledWith("u1", "m1");
      expect(result.ok).toBe(true);
    });
  });
});
