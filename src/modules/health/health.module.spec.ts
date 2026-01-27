import "reflect-metadata";
import { HealthModule } from "./health.module";

describe("HealthModule metadata", () => {
  it("defines imports/providers/controllers metadata", () => {
    const imports = Reflect.getMetadata("imports", HealthModule);
    const providers = Reflect.getMetadata("providers", HealthModule);
    const controllers = Reflect.getMetadata("controllers", HealthModule);

    expect(imports).toBeDefined();
    expect(providers).toBeDefined();
    expect(controllers).toBeDefined();
  });
});
