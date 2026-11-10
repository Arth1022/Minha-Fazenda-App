CREATE TABLE `marcadores_mapa` (
	`id` text PRIMARY KEY NOT NULL,
	`talhao_id` text,
	`tipo` text NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`resolvido` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`talhao_id`) REFERENCES `talhoes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `marcadores_mapa_lat_lng_idx` ON `marcadores_mapa` (`lat`,`lng`);--> statement-breakpoint
CREATE INDEX `marcadores_mapa_talhao_idx` ON `marcadores_mapa` (`talhao_id`);--> statement-breakpoint
ALTER TABLE `talhoes` ADD `cultura` text;--> statement-breakpoint
ALTER TABLE `talhoes` ADD `fase_lavoura` text;--> statement-breakpoint
ALTER TABLE `talhoes` ADD `data_plantio` integer;