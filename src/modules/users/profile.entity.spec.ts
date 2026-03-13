import { Profile } from "./profile.entity";
import { SocialPlatform } from "./profile.enums";

describe("Profile Entity", () => {
  describe("validateProfile", () => {
    it("returns invalid if fields are missing", () => {
      const profile: Partial<Profile> = {
        firstName: "",
      };
      const result = Profile.validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain("firstName");
      expect(result.missingFields).toContain("bio");
      expect(result.missingFields).toContain("birthDate");
      expect(result.missingFields).toContain("gender");
      expect(result.missingFields).toContain("avatar");
      expect(result.missingFields).toContain("city");
      expect(result.missingFields).toContain("country");
      expect(result.missingFields).toContain("genres");
      expect(result.missingFields).toContain("instruments");
    });

    it("returns valid if all required fields are present", () => {
      const profile: any = {
        firstName: "John",
        bio: "Musician bio",
        birthDate: "1990-01-01",
        gender: "Male",
        avatarMediaId: "avatar-id",
        city: "Paris",
        country: "France",
        genres: [{ id: "g1" }],
        instruments: [{ id: "i1" }],
      };
      const result = Profile.validateProfile(profile);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it("social links are optional and do not affect validity", () => {
      const profile: any = {
        firstName: "John",
        bio: "Musician bio",
        birthDate: "1990-01-01",
        gender: "Male",
        avatarMediaId: "avatar-id",
        city: "Paris",
        country: "France",
        genres: [{ id: "g1" }],
        instruments: [{ id: "i1" }],
        socialLinks: [{ platform: SocialPlatform.Instagram, url: "http://..." }],
      };
      const result = Profile.validateProfile(profile);
      expect(result.isValid).toBe(true);
    });
  });
});
