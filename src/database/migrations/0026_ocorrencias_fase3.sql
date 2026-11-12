ALTER TABLE `tarefas` ADD `animal_id` text REFERENCES animais(id) ON UPDATE no action ON DELETE set null;--> statement-breakpoint
ALTER TABLE `tarefas` ADD `maquina_id` text REFERENCES maquinas(id) ON UPDATE no action ON DELETE set null;--> statement-breakpoint
ALTER TABLE `tarefas` ADD `maquina_parada` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tarefas` ADD `audio_uri` text;--> statement-breakpoint
CREATE INDEX `tarefas_animal_id_idx` ON `tarefas` (`animal_id`);--> statement-breakpoint
CREATE INDEX `tarefas_maquina_id_idx` ON `tarefas` (`maquina_id`);