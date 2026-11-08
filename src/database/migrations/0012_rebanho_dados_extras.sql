CREATE TABLE `anotacoes_animal` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`data` integer NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`texto` text NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `anotacoes_animal_animal_id_idx` ON `anotacoes_animal` (`animal_id`);--> statement-breakpoint
CREATE TABLE `avaliacoes_corporais` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`data` integer NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`escore` real NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `avaliacoes_corporais_animal_id_idx` ON `avaliacoes_corporais` (`animal_id`);--> statement-breakpoint
CREATE TABLE `cios` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`data` integer NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`observacoes` text,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cios_animal_id_idx` ON `cios` (`animal_id`);--> statement-breakpoint
CREATE TABLE `controles_leiteiros` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`data` integer NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`litros` real NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `controles_leiteiros_animal_id_idx` ON `controles_leiteiros` (`animal_id`);--> statement-breakpoint
CREATE TABLE `exames` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`data` integer NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`tipo` text NOT NULL,
	`descricao` text,
	`resultado` text NOT NULL,
	`validade_dias` integer,
	`comprovante_uri` text,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exames_animal_id_idx` ON `exames` (`animal_id`);--> statement-breakpoint
CREATE TABLE `mastites` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`data` integer NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`tetos` text NOT NULL,
	`tipo` text NOT NULL,
	`observacoes` text,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `mastites_animal_id_idx` ON `mastites` (`animal_id`);--> statement-breakpoint
CREATE TABLE `secagens` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`data` integer NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `secagens_animal_id_idx` ON `secagens` (`animal_id`);--> statement-breakpoint
ALTER TABLE `animais` ADD `valor_compra` real;--> statement-breakpoint
ALTER TABLE `animais` ADD `valor_venda` real;--> statement-breakpoint
ALTER TABLE `animais` ADD `peso_saida_kg` real;--> statement-breakpoint
ALTER TABLE `animais` ADD `sisbov` text;--> statement-breakpoint
ALTER TABLE `animais` ADD `grau_sangue` text;--> statement-breakpoint
ALTER TABLE `animais` ADD `foto_uri` text;--> statement-breakpoint
ALTER TABLE `animais` ADD `data_desmame` integer;--> statement-breakpoint
ALTER TABLE `animais` ADD `parto_assistido` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `pesagens` ADD `metodo` text DEFAULT 'balanca' NOT NULL;--> statement-breakpoint
ALTER TABLE `reproducoes` ADD `data_diagnostico` integer;--> statement-breakpoint
ALTER TABLE `reproducoes` ADD `metodo_diagnostico` text;--> statement-breakpoint
ALTER TABLE `reproducoes` ADD `data_aborto` integer;--> statement-breakpoint
ALTER TABLE `tratamentos` ADD `comprovante_uri` text;