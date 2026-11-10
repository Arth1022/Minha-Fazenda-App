CREATE TABLE `abastecimentos` (
	`id` text PRIMARY KEY NOT NULL,
	`maquina_id` text NOT NULL,
	`uso_id` text,
	`operador` text,
	`operador_id` text,
	`litros` real NOT NULL,
	`tanque_cheio` integer DEFAULT true NOT NULL,
	`origem` text DEFAULT 'fazenda' NOT NULL,
	`horimetro_h` real,
	`lat` real,
	`lng` real,
	`foto_uri` text,
	`abastecido_em` integer NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`maquina_id`) REFERENCES `maquinas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uso_id`) REFERENCES `usos_maquina`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `abastecimentos_maquina_data_idx` ON `abastecimentos` (`maquina_id`,`abastecido_em`);--> statement-breakpoint
CREATE TABLE `leituras_horimetro` (
	`id` text PRIMARY KEY NOT NULL,
	`maquina_id` text NOT NULL,
	`uso_id` text,
	`operador` text,
	`operador_id` text,
	`valor_h` real NOT NULL,
	`estimado_h` real,
	`origem` text DEFAULT 'avulsa' NOT NULL,
	`foto_uri` text,
	`lido_em` integer NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`maquina_id`) REFERENCES `maquinas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uso_id`) REFERENCES `usos_maquina`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `leituras_horimetro_maquina_data_idx` ON `leituras_horimetro` (`maquina_id`,`lido_em`);--> statement-breakpoint
CREATE TABLE `ocorrencias_maquina` (
	`id` text PRIMARY KEY NOT NULL,
	`maquina_id` text NOT NULL,
	`uso_id` text,
	`operador` text,
	`operador_id` text,
	`categoria` text NOT NULL,
	`pode_usar` integer NOT NULL,
	`descricao` text,
	`foto_uri` text,
	`lat` real,
	`lng` real,
	`registrado_em` integer NOT NULL,
	`resolvida_em` integer,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`maquina_id`) REFERENCES `maquinas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uso_id`) REFERENCES `usos_maquina`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ocorrencias_maquina_maquina_idx` ON `ocorrencias_maquina` (`maquina_id`,`resolvida_em`);--> statement-breakpoint
CREATE TABLE `paradas_uso` (
	`id` text PRIMARY KEY NOT NULL,
	`uso_id` text NOT NULL,
	`motivo` text NOT NULL,
	`inicio` integer NOT NULL,
	`fim` integer,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`uso_id`) REFERENCES `usos_maquina`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `paradas_uso_uso_id_idx` ON `paradas_uso` (`uso_id`);--> statement-breakpoint
CREATE TABLE `pontos_gps` (
	`id` text PRIMARY KEY NOT NULL,
	`uso_id` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`precisao_m` real,
	`velocidade_ms` real,
	`simulado` integer DEFAULT false NOT NULL,
	`registrado_em` integer NOT NULL,
	FOREIGN KEY (`uso_id`) REFERENCES `usos_maquina`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pontos_gps_uso_registrado_idx` ON `pontos_gps` (`uso_id`,`registrado_em`);--> statement-breakpoint
ALTER TABLE `anotacoes_maquina` ADD `uso_id` text REFERENCES usos_maquina(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `maquinas` ADD `categoria` text DEFAULT 'motorizada' NOT NULL;--> statement-breakpoint
ALTER TABLE `maquinas` ADD `tanque_litros` real;--> statement-breakpoint
ALTER TABLE `maquinas` ADD `largura_trabalho_m` real;--> statement-breakpoint
ALTER TABLE `maquinas` ADD `possui_horimetro` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `maquinas` ADD `velocidade_max_kmh` real;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `operador_id` text;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `implemento_id` text REFERENCES maquinas(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `atividade` text;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `origem` text DEFAULT 'app' NOT NULL;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `fim_motivo` text;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `rastreado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `inicio_lat` real;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `inicio_lng` real;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `fim_lat` real;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `fim_lng` real;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `km_total` real;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `km_trabalhando` real;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `seg_trabalhando` integer;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `seg_deslocando` integer;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `seg_parada` integer;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `seg_pausa` integer;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `seg_sem_sinal` integer;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `area_estimada_ha` real;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `qualidade` real;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `localizacao_simulada` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `rastro` text;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `talhoes` text;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `parada_avisada_em` integer;--> statement-breakpoint
ALTER TABLE `usos_maquina` ADD `continua_ate` integer;--> statement-breakpoint
CREATE INDEX `usos_maquina_operador_aberto_idx` ON `usos_maquina` (`operador_id`) WHERE "usos_maquina"."fim" is null;--> statement-breakpoint
CREATE INDEX `usos_maquina_implemento_idx` ON `usos_maquina` (`implemento_id`);--> statement-breakpoint
-- Plantadeira e implemento não têm motor: sem combustível nem horímetro (o uso vem do trator)
UPDATE `maquinas` SET `categoria` = 'implemento', `combustivel` = NULL, `possui_horimetro` = 0 WHERE `tipo` IN ('plantadeira', 'implemento');
