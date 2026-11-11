CREATE TABLE `ciclos_plantio` (
	`id` text PRIMARY KEY NOT NULL,
	`area_id` text NOT NULL,
	`cultura` text NOT NULL,
	`modelo_id` text,
	`data_plantio` integer NOT NULL,
	`area_ha` real NOT NULL,
	`taxa_kg_ha` real NOT NULL,
	`saco_kg` real NOT NULL,
	`sementes_kg` real NOT NULL,
	`sacos` integer NOT NULL,
	`calculo_desatualizado` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'ativo' NOT NULL,
	`encerrado_em` integer,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`area_id`) REFERENCES `talhoes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ciclos_plantio_area_ativo_idx` ON `ciclos_plantio` (`area_id`) WHERE "ciclos_plantio"."status" = 'ativo';--> statement-breakpoint
CREATE INDEX `ciclos_plantio_area_plantio_idx` ON `ciclos_plantio` (`area_id`,`data_plantio`);--> statement-breakpoint
CREATE TABLE `etapas_ciclo` (
	`id` text PRIMARY KEY NOT NULL,
	`ciclo_id` text NOT NULL,
	`ordem` integer NOT NULL,
	`nome` text NOT NULL,
	`tipo` text NOT NULL,
	`prevista_em` integer NOT NULL,
	`realizada_em` integer,
	`observacao` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`ciclo_id`) REFERENCES `ciclos_plantio`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `etapas_ciclo_ciclo_ordem_idx` ON `etapas_ciclo` (`ciclo_id`,`ordem`);--> statement-breakpoint
CREATE TABLE `modelos_cultura` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`taxa_kg_ha` real,
	`saco_kg` real DEFAULT 20 NOT NULL,
	`etapas` text NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
