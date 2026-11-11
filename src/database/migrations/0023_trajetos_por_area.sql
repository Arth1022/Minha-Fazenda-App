CREATE TABLE `usos_area` (
	`id` text PRIMARY KEY NOT NULL,
	`uso_id` text NOT NULL,
	`area_id` text NOT NULL,
	`inicio` integer NOT NULL,
	`segundos` integer NOT NULL,
	`km` real NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`uso_id`) REFERENCES `usos_maquina`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`area_id`) REFERENCES `talhoes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usos_area_uso_area_idx` ON `usos_area` (`uso_id`,`area_id`);--> statement-breakpoint
CREATE INDEX `usos_area_area_inicio_idx` ON `usos_area` (`area_id`,`inicio`);--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `regras_desde` integer;--> statement-breakpoint
CREATE INDEX `usos_maquina_inicio_idx` ON `usos_maquina` (`inicio`);