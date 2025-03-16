CREATE TABLE "accessories" (
	"accessory_id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"current_price" numeric(10, 2) NOT NULL,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"min_stock" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"admin_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"access_level" varchar(20) DEFAULT 'full' NOT NULL,
	"can_manage_users" boolean DEFAULT true,
	"can_manage_finances" boolean DEFAULT true,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admins_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"log_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(50) NOT NULL,
	"table_name" varchar(50) NOT NULL,
	"record_id" integer,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_debts" (
	"debt_id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"order_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"description" text NOT NULL,
	"debt_date" timestamp DEFAULT now(),
	"due_date" date,
	"is_paid" boolean DEFAULT false,
	"payment_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"customer_id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(50) NOT NULL,
	"last_name" varchar(50) NOT NULL,
	"phone_number" varchar(15) NOT NULL,
	"alternative_phone" varchar(15),
	"address" text NOT NULL,
	"location_reference" text,
	"customer_type" varchar(20) DEFAULT 'regular',
	"rating" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "customer_type_check" CHECK ("customers"."customer_type" IN ('regular', 'wholesale', 'recurrent')),
	CONSTRAINT "rating_range_check" CHECK ("customers"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "daily_cash_reconciliation" (
	"reconciliation_id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"reconciliation_date" date NOT NULL,
	"operator_id" integer NOT NULL,
	"starting_cash" numeric(10, 2) NOT NULL,
	"ending_cash" numeric(10, 2) NOT NULL,
	"expected_cash" numeric(10, 2) NOT NULL,
	"difference" numeric(10, 2) NOT NULL,
	"approved_by" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"report_id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"report_date" date NOT NULL,
	"user_id" integer NOT NULL,
	"total_sales" numeric(10, 2) DEFAULT '0' NOT NULL,
	"cash_sales" numeric(10, 2) DEFAULT '0' NOT NULL,
	"digital_sales" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_expenses" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tanks_sold" integer DEFAULT 0 NOT NULL,
	"accessories_sold" integer DEFAULT 0 NOT NULL,
	"pending_orders" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"is_closed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "delivery_inventory_assignments" (
	"assignment_id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"assignment_date" date NOT NULL,
	"assigned_by" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "assignment_status_check" CHECK ("delivery_inventory_assignments"."status" IN ('assigned', 'returned', 'reconciled'))
);
--> statement-breakpoint
CREATE TABLE "delivery_inventory_items" (
	"item_id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"tank_type_id" integer NOT NULL,
	"full_tanks_assigned" integer DEFAULT 0 NOT NULL,
	"empty_tanks_assigned" integer DEFAULT 0 NOT NULL,
	"full_tanks_returned" integer DEFAULT 0,
	"empty_tanks_returned" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "delivery_personnel" (
	"personnel_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"license_number" varchar(50),
	"license_expiry" date,
	"vehicle_type_preference" varchar(20),
	"total_deliveries" integer DEFAULT 0,
	"average_rating" numeric(3, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "delivery_personnel_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"expense_id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"expense_date" date NOT NULL,
	"expense_type" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"transaction_id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"tank_type_id" integer NOT NULL,
	"transaction_type" varchar(20) NOT NULL,
	"full_tanks_change" integer DEFAULT 0 NOT NULL,
	"empty_tanks_change" integer DEFAULT 0 NOT NULL,
	"user_id" integer NOT NULL,
	"transaction_date" timestamp DEFAULT now(),
	"reference_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "transac_type1" CHECK ("inventory_transactions"."transaction_type" IN ('purchase', 'sale', 'return', 'transfer', 'assignment'))
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"invoice_id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"issue_date" timestamp DEFAULT now(),
	"customer_id" integer NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number"),
	CONSTRAINT "invoice_status_check" CHECK ("invoices"."status" IN ('issued', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"operator_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"can_create_reports" boolean DEFAULT true,
	"can_modify_inventory" boolean DEFAULT false,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "operators_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"item_id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"item_type" varchar(10) NOT NULL,
	"tank_type_id" integer,
	"accessory_id" integer,
	"quantity" integer NOT NULL,
	"tank_returned" boolean DEFAULT true,
	"unit_price" numeric(10, 2) NOT NULL,
	"delivered_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "item_type_check" CHECK ("order_items"."item_type" IN ('tank', 'accessory')),
	CONSTRAINT "item_type_tank_check" CHECK (("order_items"."item_type" = 'tank' AND "order_items"."tank_type_id" IS NOT NULL AND "order_items"."accessory_id" IS NULL) OR
          ("order_items"."item_type" = 'accessory' AND "order_items"."accessory_id" IS NOT NULL AND "order_items"."tank_type_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"order_id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"order_date" timestamp DEFAULT now(),
	"delivery_address" text NOT NULL,
	"location_reference" text,
	"status" varchar(20) NOT NULL,
	"priority" integer DEFAULT 1,
	"payment_method" varchar(20) NOT NULL,
	"payment_status" varchar(20) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"received_by" integer,
	"delivered_by" integer,
	"delivery_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "order_status_check" CHECK ("orders"."status" IN ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled')),
	CONSTRAINT "payment_method_check" CHECK ("orders"."payment_method" IN ('cash', 'yape', 'plin', 'transfer')),
	CONSTRAINT "payment_status_check" CHECK ("orders"."payment_status" IN ('pending', 'paid', 'debt'))
);
--> statement-breakpoint
CREATE TABLE "store_assignments" (
	"assignment_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "store_inventory" (
	"inventory_id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"tank_type_id" integer NOT NULL,
	"full_tanks" integer DEFAULT 0 NOT NULL,
	"empty_tanks" integer DEFAULT 0 NOT NULL,
	"min_stock" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"store_id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"address" text NOT NULL,
	"phone_number" varchar(15),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_order_items" (
	"item_id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"tank_type_id" integer NOT NULL,
	"full_tanks_ordered" integer NOT NULL,
	"empty_tanks_returned" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_orders" (
	"order_id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"order_date" timestamp DEFAULT now(),
	"delivery_date" timestamp,
	"status" varchar(20) NOT NULL,
	"user_id" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "supplier_order_status_check" CHECK ("supplier_orders"."status" IN ('pending', 'delivered', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "tank_types" (
	"type_id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"weight" numeric(5, 2) NOT NULL,
	"description" text,
	"current_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"profile_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"first_name" varchar(50) NOT NULL,
	"last_name" varchar(50) NOT NULL,
	"phone_number" varchar(15) NOT NULL,
	"address" text,
	"entry_date" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"email" varchar(100) NOT NULL,
	"role" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "user_role_check1" CHECK ("users"."role" IN ('admin', 'operator', 'delivery'))
);
--> statement-breakpoint
CREATE TABLE "vehicle_assignments" (
	"assignment_id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"assignment_date" date NOT NULL,
	"return_date" date,
	"initial_mileage" numeric(10, 2),
	"final_mileage" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_fuel_purchases" (
	"purchase_id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"purchase_date" timestamp DEFAULT now(),
	"amount_liters" numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"odometer_reading" numeric(10, 2) NOT NULL,
	"fuel_type" varchar(20) NOT NULL,
	"receipt_number" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_maintenance" (
	"maintenance_id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"maintenance_date" date NOT NULL,
	"maintenance_type" varchar(50) NOT NULL,
	"description" text,
	"cost" numeric(10, 2) NOT NULL,
	"next_maintenance_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"vehicle_id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"model" varchar(50) NOT NULL,
	"plate_number" varchar(20) NOT NULL,
	"vehicle_type" varchar(20) NOT NULL,
	"max_capacity" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicles_plate_number_unique" UNIQUE("plate_number"),
	CONSTRAINT "vehicle_status_check" CHECK ("vehicles"."status" IN ('available', 'in_use', 'maintenance'))
);
--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_debts" ADD CONSTRAINT "customer_debts_customer_id_customers_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_debts" ADD CONSTRAINT "customer_debts_order_id_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_cash_reconciliation" ADD CONSTRAINT "daily_cash_reconciliation_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_cash_reconciliation" ADD CONSTRAINT "daily_cash_reconciliation_operator_id_operators_operator_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("operator_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_cash_reconciliation" ADD CONSTRAINT "daily_cash_reconciliation_approved_by_admins_admin_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("admin_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_inventory_assignments" ADD CONSTRAINT "delivery_inventory_assignments_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_inventory_assignments" ADD CONSTRAINT "delivery_inventory_assignments_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_inventory_assignments" ADD CONSTRAINT "delivery_inventory_assignments_assigned_by_users_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_inventory_items" ADD CONSTRAINT "delivery_inventory_items_assignment_id_delivery_inventory_assignments_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."delivery_inventory_assignments"("assignment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_inventory_items" ADD CONSTRAINT "delivery_inventory_items_tank_type_id_tank_types_type_id_fk" FOREIGN KEY ("tank_type_id") REFERENCES "public"."tank_types"("type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_personnel" ADD CONSTRAINT "delivery_personnel_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_tank_type_id_tank_types_type_id_fk" FOREIGN KEY ("tank_type_id") REFERENCES "public"."tank_types"("type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operators" ADD CONSTRAINT "operators_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operators" ADD CONSTRAINT "operators_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tank_type_id_tank_types_type_id_fk" FOREIGN KEY ("tank_type_id") REFERENCES "public"."tank_types"("type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_accessory_id_accessories_accessory_id_fk" FOREIGN KEY ("accessory_id") REFERENCES "public"."accessories"("accessory_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_delivered_by_delivery_personnel_personnel_id_fk" FOREIGN KEY ("delivered_by") REFERENCES "public"."delivery_personnel"("personnel_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_received_by_operators_operator_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."operators"("operator_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivered_by_delivery_personnel_personnel_id_fk" FOREIGN KEY ("delivered_by") REFERENCES "public"."delivery_personnel"("personnel_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_assignments" ADD CONSTRAINT "store_assignments_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_assignments" ADD CONSTRAINT "store_assignments_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_inventory" ADD CONSTRAINT "store_inventory_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_inventory" ADD CONSTRAINT "store_inventory_tank_type_id_tank_types_type_id_fk" FOREIGN KEY ("tank_type_id") REFERENCES "public"."tank_types"("type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_order_id_supplier_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_tank_type_id_tank_types_type_id_fk" FOREIGN KEY ("tank_type_id") REFERENCES "public"."tank_types"("type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_fuel_purchases" ADD CONSTRAINT "vehicle_fuel_purchases_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_fuel_purchases" ADD CONSTRAINT "vehicle_fuel_purchases_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_maintenance" ADD CONSTRAINT "vehicle_maintenance_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_reconciliation" ON "daily_cash_reconciliation" USING btree ("store_id","reconciliation_date");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_daily_report" ON "daily_reports" USING btree ("store_id","report_date");