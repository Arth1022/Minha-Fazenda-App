CREATE TABLE `movimentacoes` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`area_id` text NOT NULL,
	`lote_id` text,
	`entrada_em` integer NOT NULL,
	`saida_em` integer,
	`registrado_por` text,
	`registrado_por_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animais`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`area_id`) REFERENCES `talhoes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `movimentacoes_animal_aberta_idx` ON `movimentacoes` (`animal_id`) WHERE "movimentacoes"."saida_em" is null;--> statement-breakpoint
CREATE INDEX `movimentacoes_animal_entrada_idx` ON `movimentacoes` (`animal_id`,`entrada_em`);--> statement-breakpoint
CREATE INDEX `movimentacoes_area_idx` ON `movimentacoes` (`area_id`,`saida_em`,`entrada_em`);--> statement-breakpoint
CREATE INDEX `movimentacoes_lote_entrada_idx` ON `movimentacoes` (`lote_id`,`entrada_em`);--> statement-breakpoint
ALTER TABLE `lotes` ADD `descricao` text;