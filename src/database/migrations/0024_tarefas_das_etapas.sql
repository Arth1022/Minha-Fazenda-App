ALTER TABLE `etapas_ciclo` ADD `responsavel_id` text;--> statement-breakpoint
ALTER TABLE `etapas_ciclo` ADD `responsavel_nome` text;--> statement-breakpoint
ALTER TABLE `etapas_ciclo` ADD `atribuida_em` integer;--> statement-breakpoint
ALTER TABLE `etapas_ciclo` ADD `atribuida_por` text;--> statement-breakpoint
CREATE INDEX `etapas_ciclo_responsavel_idx` ON `etapas_ciclo` (`responsavel_id`,`prevista_em`);