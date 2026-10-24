CREATE TABLE `tratamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`medicamento` text NOT NULL,
	`data_inicio` integer NOT NULL,
	`data_fim` integer,
	`dias_confirmados` text NOT NULL,
	`proxima_dose_em` integer,
	`notificacao_ativa` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tratamentos_animal_id_idx` ON `tratamentos` (`animal_id`);