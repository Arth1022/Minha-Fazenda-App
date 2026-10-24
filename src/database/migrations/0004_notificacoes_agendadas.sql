CREATE TABLE `notificacoes_agendadas` (
	`id` text PRIMARY KEY NOT NULL,
	`entidade` text NOT NULL,
	`entidade_id` text NOT NULL,
	`dispara_em` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notificacoes_agendadas_entidade_idx` ON `notificacoes_agendadas` (`entidade`,`entidade_id`);