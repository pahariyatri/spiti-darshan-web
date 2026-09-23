CREATE TYPE "public"."admin_role" AS ENUM('owner', 'editor');--> statement-breakpoint
CREATE TYPE "public"."lead_event_type" AS ENUM('whatsapp_click', 'route_view', 'route_day_interest');--> statement-breakpoint
CREATE TYPE "public"."route_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."stop_type" AS ENUM('start', 'stop', 'viewpoint', 'monastery', 'attraction', 'bridge', 'village', 'lake', 'pass', 'detour', 'activity', 'overnight', 'return');--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'editor' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "attractions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "attractions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"destination_id" integer,
	"attraction_type" text DEFAULT 'attraction' NOT NULL,
	"short_description" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_optional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "destinations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"region" text DEFAULT '' NOT NULL,
	"short_description" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_major_stop" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destinations_lat" CHECK ("destinations"."latitude" is null or "destinations"."latitude" between -90 and 90),
	CONSTRAINT "destinations_lng" CHECK ("destinations"."longitude" is null or "destinations"."longitude" between -180 and 180)
);
--> statement-breakpoint
CREATE TABLE "lead_intents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lead_intents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_type" "lead_event_type" NOT NULL,
	"route_id" integer,
	"day_number" integer,
	"cta_location" text,
	"referrer_host" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "media_assets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"base_path" text NOT NULL,
	"alt" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"variant_widths" integer[] NOT NULL,
	"formats" text[] NOT NULL,
	"fallback_format" text DEFAULT 'webp' NOT NULL,
	"credit" text,
	"license" text,
	"source_url" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_base_path_unique" UNIQUE("base_path")
);
--> statement-breakpoint
CREATE TABLE "route_day_stops" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "route_day_stops_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"route_day_id" integer NOT NULL,
	"destination_id" integer,
	"attraction_id" integer,
	"stop_name" text NOT NULL,
	"map_label" text,
	"stop_type" "stop_type" DEFAULT 'stop' NOT NULL,
	"display_order" integer NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"is_seasonal" boolean DEFAULT false NOT NULL,
	"show_on_map" boolean DEFAULT true NOT NULL,
	"map_progress_position" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "route_day_stops_progress_range" CHECK ("route_day_stops"."map_progress_position" is null or "route_day_stops"."map_progress_position" between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE "route_days" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "route_days_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"route_id" integer NOT NULL,
	"day_number" integer NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"map_leg_label" text NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"day_note" text,
	"is_seasonal" boolean DEFAULT false NOT NULL,
	"overnight_destination_id" integer,
	"media_id" integer,
	"map_segment" text,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "route_days_day_positive" CHECK ("route_days"."day_number" >= 1)
);
--> statement-breakpoint
CREATE TABLE "route_vehicle_types" (
	"route_id" integer NOT NULL,
	"vehicle_id" integer NOT NULL,
	CONSTRAINT "route_vehicle_types_route_id_vehicle_id_pk" PRIMARY KEY("route_id","vehicle_id")
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "routes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_title" text NOT NULL,
	"summary" text NOT NULL,
	"starting_location" text NOT NULL,
	"ending_location" text NOT NULL,
	"duration_days" integer NOT NULL,
	"route_type" text DEFAULT 'one-way' NOT NULL,
	"seasonality" text DEFAULT '' NOT NULL,
	"status" "route_status" DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"hero_kicker" text DEFAULT '' NOT NULL,
	"hero_title" text DEFAULT '' NOT NULL,
	"hero_title_accent" text DEFAULT '' NOT NULL,
	"hero_media_id" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routes_slug_format" CHECK ("routes"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "routes_duration_positive" CHECK ("routes"."duration_days" between 1 and 60)
);
--> statement-breakpoint
CREATE TABLE "seo_metadata" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "seo_metadata_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"canonical_path" text,
	"og_title" text,
	"og_description" text,
	"og_image_id" integer,
	"robots" text,
	"schema_override" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seo_canonical_is_path" CHECK ("seo_metadata"."canonical_path" is null or "seo_metadata"."canonical_path" ~ '^/')
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vehicles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"vehicle_type" text NOT NULL,
	"passenger_capacity" integer,
	"luggage_note" text,
	"media_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attractions" ADD CONSTRAINT "attractions_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_intents" ADD CONSTRAINT "lead_intents_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_day_stops" ADD CONSTRAINT "route_day_stops_route_day_id_route_days_id_fk" FOREIGN KEY ("route_day_id") REFERENCES "public"."route_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_day_stops" ADD CONSTRAINT "route_day_stops_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_day_stops" ADD CONSTRAINT "route_day_stops_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_days" ADD CONSTRAINT "route_days_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_days" ADD CONSTRAINT "route_days_overnight_destination_id_destinations_id_fk" FOREIGN KEY ("overnight_destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_days" ADD CONSTRAINT "route_days_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_vehicle_types" ADD CONSTRAINT "route_vehicle_types_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_vehicle_types" ADD CONSTRAINT "route_vehicle_types_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_hero_media_id_media_assets_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_og_image_id_media_assets_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_sessions_user_idx" ON "admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attractions_slug_key" ON "attractions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "attractions_destination_idx" ON "attractions" USING btree ("destination_id");--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_slug_key" ON "destinations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "lead_intents_created_at_idx" ON "lead_intents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lead_intents_route_idx" ON "lead_intents" USING btree ("route_id","created_at");--> statement-breakpoint
CREATE INDEX "route_day_stops_day_order_idx" ON "route_day_stops" USING btree ("route_day_id","display_order");--> statement-breakpoint
CREATE INDEX "route_day_stops_destination_idx" ON "route_day_stops" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "route_day_stops_attraction_idx" ON "route_day_stops" USING btree ("attraction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "route_days_route_day_key" ON "route_days" USING btree ("route_id","day_number");--> statement-breakpoint
CREATE INDEX "route_days_route_order_idx" ON "route_days" USING btree ("route_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "routes_slug_key" ON "routes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "routes_status_idx" ON "routes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "routes_single_featured_key" ON "routes" USING btree ("is_featured") WHERE "routes"."is_featured";--> statement-breakpoint
CREATE UNIQUE INDEX "seo_metadata_entity_key" ON "seo_metadata" USING btree ("entity_type","entity_id");