CREATE TABLE `animais` (
	`id` text PRIMARY KEY NOT NULL,
	`brinco` text NOT NULL,
	`nome` text,
	`raca` text,
	`peso_kg` real,
	`producao_leite_l` real,
	`crias` integer DEFAULT 0 NOT NULL,
	`racao_kg_dia` real,
	`pai_brinco` text,
	`mae_brinco` text,
	`data_nascimento` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `animais_brinco_idx` ON `animais` (`brinco`);--> statement-breakpoint
CREATE TABLE `coberturas` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`data` integer NOT NULL,
	`tipo` text NOT NULL,
	`touro_semen` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `coberturas_animal_id_idx` ON `coberturas` (`animal_id`);--> statement-breakpoint
CREATE TABLE `ordenhas` (
	`id` text PRIMARY KEY NOT NULL,
	`periodo` text NOT NULL,
	`horario_previsto` text,
	`horario_notificacao` text,
	`volume_litros` real,
	`data_registro` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tratamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`medicamento` text NOT NULL,
	`data_inicio` integer NOT NULL,
	`data_fim` integer,
	`dias_confirmados` text NOT NULL,
	`proxima_dose_em` integer,
	`notificacao_ativa` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tratamentos`("id", "animal_id", "medicamento", "data_inicio", "data_fim", "dias_confirmados", "proxima_dose_em", "notificacao_ativa", "created_at", "updated_at") SELECT "id", "animal_id", "medicamento", "data_inicio", "data_fim", "dias_confirmados", "proxima_dose_em", "notificacao_ativa", "created_at", "updated_at" FROM `tratamentos`;--> statement-breakpoint
DROP TABLE `tratamentos`;--> statement-breakpoint
ALTER TABLE `__new_tratamentos` RENAME TO `tratamentos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `tratamentos_animal_id_idx` ON `tratamentos` (`animal_id`);