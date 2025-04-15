import { eq } from "drizzle-orm";
import { SeedModule } from "./types";
import { seedTracker } from "../schemas/internal";
import type { DrizzleDB } from "./types";

// Seed version to track changes in seed data
const SEED_VERSION = "1.0";

export class SeedManager {
  private executionOrder: string[] = [];
  private visited: Set<string> = new Set();
  private temporaryVisited: Set<string> = new Set();

  constructor(private db: DrizzleDB, private modules: SeedModule[]) {}

  /**
   * Validates the dependency graph and builds execution order
   * @returns true if valid, throws error if invalid
   */
  validateDependencyGraph(): boolean {
    this.executionOrder = [];
    this.visited = new Set();
    this.temporaryVisited = new Set();

    const moduleMap = new Map<string, SeedModule>();
    this.modules.forEach((module) => moduleMap.set(module.name, module));

    // Check for missing dependencies
    for (const module of this.modules) {
      if (module.dependencies) {
        for (const dep of module.dependencies) {
          if (!moduleMap.has(dep)) {
            throw new Error(
              `Module '${module.name}' depends on '${dep}', but that module doesn't exist`
            );
          }
        }
      }
    }

    // Build execution order with cycle detection
    for (const module of this.modules) {
      if (!this.visited.has(module.name)) {
        if (!this.dfs(module, moduleMap)) {
          return false;
        }
      }
    }

    console.log(`🔄 Execution order: ${this.executionOrder.join(" -> ")}`);
    return true;
  }

  /**
   * Depth-first search for topological sorting with cycle detection
   */
  private dfs(module: SeedModule, moduleMap: Map<string, SeedModule>): boolean {
    if (this.temporaryVisited.has(module.name)) {
      throw new Error(
        `Circular dependency detected involving module '${module.name}'`
      );
    }

    if (this.visited.has(module.name)) {
      return true;
    }

    this.temporaryVisited.add(module.name);

    if (module.dependencies) {
      for (const depName of module.dependencies) {
        const depModule = moduleMap.get(depName);
        if (!depModule) {
          throw new Error(`Dependency '${depName}' not found`);
        }
        if (!this.dfs(depModule, moduleMap)) {
          return false;
        }
      }
    }

    this.temporaryVisited.delete(module.name);
    this.visited.add(module.name);
    this.executionOrder.push(module.name);

    return true;
  }

  async checkSeedStatus(module: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(seedTracker)
      .where(eq(seedTracker.module, module));

    return result.length > 0;
  }

  async markSeedComplete(module: string): Promise<void> {
    await this.db.insert(seedTracker).values({
      module,
      version: SEED_VERSION,
    });
    console.log(`✅ Marked seed module '${module}' as complete`);
  }

  async executeModule(module: SeedModule): Promise<boolean> {
    try {
      // Check if already executed
      const isComplete = await this.checkSeedStatus(module.name);
      if (isComplete) {
        console.log(
          `⏭️ Seed module '${module.name}' already completed, skipping`
        );
        return true;
      }

      // Check dependencies are completed
      if (module.dependencies && module.dependencies.length > 0) {
        for (const dep of module.dependencies) {
          const depComplete = await this.checkSeedStatus(dep);
          if (!depComplete) {
            console.log(
              `⚠️ Dependency '${dep}' for '${module.name}' not yet completed`
            );
            return false;
          }
        }
      }

      // Execute module
      console.log(
        `🔄 Running seed module '${module.name}': ${module.description}`
      );
      await module.run(this.db);

      // Mark as complete
      await this.markSeedComplete(module.name);
      console.log(`✅ Seed module '${module.name}' completed successfully`);

      return true;
    } catch (error) {
      console.error(`❌ Error executing seed module '${module.name}':`, error);
      return false;
    }
  }

  /**
   * Runs seeds in the calculated topological order
   */
  async runInOrder(): Promise<void> {
    // Validate dependency graph first
    this.validateDependencyGraph();

    const moduleMap = new Map<string, SeedModule>();
    this.modules.forEach((module) => moduleMap.set(module.name, module));

    // Run in calculated order
    for (const moduleName of this.executionOrder) {
      const module = moduleMap.get(moduleName)!;
      const success = await this.executeModule(module);

      if (!success) {
        console.warn(
          `⚠️ Failed to execute module '${moduleName}', stopping execution`
        );
        break;
      }
    }
  }
}
