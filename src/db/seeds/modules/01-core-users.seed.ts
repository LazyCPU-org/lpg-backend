import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { UserRoleEnum } from "../../../config/roles";
import { UserStatus } from "../../../utils/status";
import {
  superadmins,
  userProfiles,
  users,
} from "../../schemas/user-management";
import type { DrizzleDB } from "../types";
import { SeedModule } from "../types";

const run = async (db: DrizzleDB): Promise<void> => {
  // Check if superadmin already exists
  const existingSuperadmin = await db
    .select()
    .from(users)
    .where(eq(users.role, UserRoleEnum.SUPERADMIN))
    .limit(1);

  if (existingSuperadmin.length > 0) {
    console.log(
      `Superadmin already exists (${existingSuperadmin[0].email}). Skipping seed.`
    );
    return;
  }

  // Validate required environment variables
  const requiredEnvVars = ["SUPERADMIN_EMAIL", "SUPERADMIN_PASSWORD"];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Environment variable ${envVar} is not set`);
    }
  }

  // Hash password with high security for superadmin
  const passwordHash = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD!, 14);

  console.log(
    `Creating superadmin with email: ${process.env.SUPERADMIN_EMAIL}`
  );

  await db.transaction(async (tx) => {
    // Insert user
    const userResult = await tx
      .insert(users)
      .values({
        name: "Diego",
        email: process.env.SUPERADMIN_EMAIL!,
        passwordHash,
        role: UserRoleEnum.SUPERADMIN,
        status: UserStatus.ACTIVE,
        isVerified: true,
        permissions: ["*"],
      })
      .returning();

    const newUser = userResult[0];

    // Create Profile
    await tx.insert(userProfiles).values({
      userId: newUser.userId,
      firstName: "Diego",
      lastName: "Marquina",
      phoneNumber: "957610468",
    });

    // Insert superadmin
    await tx.insert(superadmins).values({
      userId: newUser.userId,
    });

    console.log(`Superadmin created successfully with ID: ${newUser.userId}`);
  });
};

const coreUsersSeed: SeedModule = {
  name: "core_users",
  description: "Creates initial superadmin account",
  dependencies: [], // No dependencies for the first module
  run,
};

export default coreUsersSeed;
