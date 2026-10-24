CREATE TABLE `doses_aplicadas` (
	`id` text PRIMARY KEY NOT NULL,
	`tratamento_id` text NOT NULL,
	`dia` integer NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tratamento_id`) REFERENCES `tratamentos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `doses_aplicadas_tratamento_dia_idx` ON `doses_aplicadas` (`tratamento_id`,`dia`);--> statement-breakpoint
ALTER TABLE `animais` ADD `pai_id` text REFERENCES animais(id) ON UPDATE no action ON DELETE set null;--> statement-breakpoint
ALTER TABLE `animais` ADD `pai_descricao` text;--> statement-breakpoint
CREATE INDEX `animais_pai_id_idx` ON `animais` (`pai_id`);--> statement-breakpoint
ALTER TABLE `reproducoes` ADD `touro_id` text REFERENCES animais(id) ON UPDATE no action ON DELETE set null;--> statement-breakpoint
ALTER TABLE `reproducoes` ADD `touro_descricao` text;--> statement-breakpoint
CREATE INDEX `reproducoes_touro_id_idx` ON `reproducoes` (`touro_id`);--> statement-breakpoint
ALTER TABLE `tratamentos` ADD `dias_semana` text DEFAULT '[1,2,3,4,5,6,7]' NOT NULL;--> statement-breakpoint
ALTER TABLE `tratamentos` ADD `horario` text;--> statement-breakpoint
ALTER TABLE `tratamentos` ADD `intervalo_horas` integer;--> statement-breakpoint
ALTER TABLE `tratamentos` ADD `aviso_minutos_antes` integer DEFAULT 0 NOT NULL;