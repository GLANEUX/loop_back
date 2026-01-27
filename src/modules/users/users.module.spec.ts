import "reflect-metadata";
import { UsersModule } from "./users.module";

describe("UsersModule metadata", () => {
  it("defines imports/providers/controllers metadata", () => {
    const imports = Reflect.getMetadata("imports", UsersModule);
    const providers = Reflect.getMetadata("providers", UsersModule);
    const controllers = Reflect.getMetadata("controllers", UsersModule);

    expect(imports).toBeDefined();
    expect(providers).toBeDefined();
    expect(controllers).toBeDefined();
  });
});
