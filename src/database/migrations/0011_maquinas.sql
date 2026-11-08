CREATE TABLE `anotacoes_maquina` (
	`id` text PRIMARY KEY NOT NULL,
	`maquina_id` text NOT NULL,
	`texto` text NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`maquina_id`) REFERENCES `maquinas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `anotacoes_maquina_maquina_id_idx` ON `anotacoes_maquina` (`maquina_id`);--> statement-breakpoint
CREATE TABLE `maquinas` (
	`id` text PRIMARY KEY NOT NULL,
	`codigo` text NOT NULL,
	`nome` text NOT NULL,
	`tipo` text DEFAULT 'outro' NOT NULL,
	`marca` text,
	`modelo` text,
	`ano_fabricacao` integer,
	`numero_serie` text,
	`placa` text,
	`potencia_cv` real,
	`combustivel` text,
	`horimetro_inicial` real,
	`data_aquisicao` integer,
	`status` text DEFAULT 'ativa' NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `maquinas_codigo_idx` ON `maquinas` (`codigo`);--> statement-breakpoint
CREATE TABLE `usos_maquina` (
	`id` text PRIMARY KEY NOT NULL,
	`maquina_id` text NOT NULL,
	`inicio` integer NOT NULL,
	`fim` integer,
	`operador` text,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`maquina_id`) REFERENCES `maquinas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `usos_maquina_maquina_inicio_idx` ON `usos_maquina` (`maquina_id`,`inicio`);--> statement-breakpoint
CREATE UNIQUE INDEX `usos_maquina_aberto_idx` ON `usos_maquina` (`maquina_id`) WHERE "usos_maquina"."fim" is null;