import "reflect-metadata";
import { AuthModule } from "./auth.module";

describe("AuthModule metadata", () => {
  it("defines imports/providers/controllers metadata", () => {
    const imports = Reflect.getMetadata("imports", AuthModule);
    const providers = Reflect.getMetadata("providers", AuthModule);
    const controllers = Reflect.getMetadata("controllers", AuthModule);

    expect(imports).toBeDefined();
    expect(providers).toBeDefined();
    expect(controllers).toBeDefined();
  });
});
