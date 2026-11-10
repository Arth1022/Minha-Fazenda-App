ALTER TABLE `lotes` ADD `area_id` text REFERENCES talhoes(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `lotes` ADD `area_desde` integer;