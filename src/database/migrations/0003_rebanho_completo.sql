CREATE TABLE `fazenda_config` (
	`id` text PRIMARY KEY NOT NULL,
	`tipo_producao` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lotes` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pesagens` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`data` integer NOT NULL,
	`peso_kg` real NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pesagens_animal_id_idx` ON `pesagens` (`animal_id`);--> statement-breakpoint
CREATE TABLE `reproducoes` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`tipo` text NOT NULL,
	`data` integer NOT NULL,
	`prenhez_confirmada` integer,
	`previsao_parto` integer,
	`data_parto` integer,
	`cria_id` text,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cria_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `reproducoes_animal_id_idx` ON `reproducoes` (`animal_id`);--> statement-breakpoint
ALTER TABLE `animais` ADD `sexo` text DEFAULT 'F' NOT NULL;--> statement-breakpoint
ALTER TABLE `animais` ADD `nascimento_aproximado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `animais` ADD `mae_id` text REFERENCES animais(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `animais` ADD `origem` text;--> statement-breakpoint
ALTER TABLE `animais` ADD `data_entrada` integer;--> statement-breakpoint
ALTER TABLE `animais` ADD `status` text DEFAULT 'ativo' NOT NULL;--> statement-breakpoint
ALTER TABLE `animais` ADD `data_saida` integer;--> statement-breakpoint
ALTER TABLE `animais` ADD `motivo_saida` text;--> statement-breakpoint
ALTER TABLE `animais` ADD `lote_id` text REFERENCES lotes(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `animais` ADD `criado_por` text;--> statement-breakpoint
CREATE INDEX `animais_mae_id_idx` ON `animais` (`mae_id`);--> statement-breakpoint
CREATE INDEX `animais_lote_id_idx` ON `animais` (`lote_id`);--> statement-breakpoint
ALTER TABLE `tratamentos` ADD `dose` text;--> statement-breakpoint
ALTER TABLE `tratamentos` ADD `carencia_leite_dias` integer;--> statement-breakpoint
ALTER TABLE `tratamentos` ADD `carencia_carne_dias` integer;--> statement-breakpoint
ALTER TABLE `tratamentos` ADD `grupo_aplicacao_id` text;--> statement-breakpoint
ALTER TABLE `tratamentos` ADD `criado_por` text;--> statement-breakpoint
CREATE INDEX `tratamentos_grupo_aplicacao_id_idx` ON `tratamentos` (`grupo_aplicacao_id`);