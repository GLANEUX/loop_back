import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserRole } from "./user-role.enum";
import { User } from "./user.entity";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    repo = moduleRef.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes email in findByEmail", async () => {
    repo.findOne.mockResolvedValueOnce(null);
    await service.findByEmail("  TEST@Loop.local ");
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { email: "test@loop.local" },
    });
  });

  it("throws conflict when email already exists", async () => {
    repo.findOne.mockResolvedValueOnce({ id: "user-1" } as User);

    await expect(service.createUser("test@loop.local", "hashed")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("creates a new user with normalized email", async () => {
    repo.findOne.mockResolvedValueOnce(null);
    repo.create.mockReturnValueOnce({ id: "user-1" } as User);
    repo.save.mockResolvedValueOnce({ id: "user-1" } as User);

    await service.createUser("  TEST@Loop.local ", "hashed");

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.create).toHaveBeenCalledWith({
      email: "test@loop.local",
      password: "hashed",
      role: UserRole.User,
    });
  });

  it("soft deletes a user by id", async () => {
    await service.softDeleteById("user-1");
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.softDelete).toHaveBeenCalledWith("user-1");
  });
});
