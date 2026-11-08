CREATE TABLE `talhoes` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`tipo` text DEFAULT 'pasto' NOT NULL,
	`cor` text NOT NULL,
	`area_hectares` real NOT NULL,
	`geometria_json` text NOT NULL,
	`centro_lat` real NOT NULL,
	`centro_lng` real NOT NULL,
	`min_lat` real NOT NULL,
	`max_lat` real NOT NULL,
	`min_lng` real NOT NULL,
	`max_lng` real NOT NULL,
	`sync_status` text DEFAULT 'created' NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `talhoes_bbox_idx` ON `talhoes` (`min_lat`,`max_lat`,`min_lng`,`max_lng`);--> statement-breakpoint
CREATE INDEX `talhoes_sync_status_idx` ON `talhoes` (`sync_status`);