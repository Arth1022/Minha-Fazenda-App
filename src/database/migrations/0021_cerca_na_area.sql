CREATE TABLE `calculos_cerca` (
	`id` text PRIMARY KEY NOT NULL,
	`area_id` text NOT NULL,
	`tipo_cerca` text NOT NULL,
	`fios` integer NOT NULL,
	`espacamento_m` real NOT NULL,
	`perimetro_m` real NOT NULL,
	`cantos` integer NOT NULL,
	`metros_arame` real NOT NULL,
	`rolos` integer NOT NULL,
	`mouroes` integer NOT NULL,
	`esticadores` integer NOT NULL,
	`preco_rolo` real,
	`preco_mourao` real,
	`preco_esticador` real,
	`custo` real,
	`desatualizado` integer DEFAULT false NOT NULL,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`area_id`) REFERENCES `talhoes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calculos_cerca_area_idx` ON `calculos_cerca` (`area_id`);