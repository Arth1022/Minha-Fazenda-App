CREATE TABLE `tarefa_eventos` (
	`id` text PRIMARY KEY NOT NULL,
	`tarefa_id` text NOT NULL,
	`tipo` text NOT NULL,
	`autor_id` text NOT NULL,
	`ocorrido_em` integer NOT NULL,
	`texto` text,
	`dados` text,
	FOREIGN KEY (`tarefa_id`) REFERENCES `tarefas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tarefa_eventos_tarefa_ocorrido_idx` ON `tarefa_eventos` (`tarefa_id`,`ocorrido_em`);--> statement-breakpoint
CREATE TABLE `tarefas` (
	`id` text PRIMARY KEY NOT NULL,
	`titulo` text NOT NULL,
	`categoria` text NOT NULL,
	`origem` text DEFAULT 'ocorrencia' NOT NULL,
	`descricao` text,
	`urgente` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'aberta' NOT NULL,
	`responsavel_id` text,
	`criado_por` text,
	`prazo` integer,
	`area_id` text,
	`ponto_lat` real,
	`ponto_lng` real,
	`sync_status` text DEFAULT 'pendente' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`area_id`) REFERENCES `talhoes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tarefas_status_responsavel_urgente_idx` ON `tarefas` (`status`,`responsavel_id`,`urgente`);--> statement-breakpoint
CREATE INDEX `tarefas_responsavel_urgente_prazo_idx` ON `tarefas` (`responsavel_id`,`urgente`,`prazo`);