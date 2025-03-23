ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "user_role_check1";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_active" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "username";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "user_role_check1" CHECK ("users"."role" IN ('superadmin', 'admin', 'operator', 'delivery'));