-- Copia os dias confirmados (índices em tratamentos.dias_confirmados, 1 = primeiro
-- dia) para doses_aplicadas, uma linha por dia com a data do dia: meia-noite local
-- de data_inicio + (N - 1) dias. O cálculo passa pelo horário local ('localtime'
-- ... 'utc') para não errar o dia em mudança de horário de verão.
-- id: UUID v4 gerado no SQLite, no mesmo formato do newId() do app.
INSERT OR IGNORE INTO `doses_aplicadas` (`id`, `tratamento_id`, `dia`, `criado_por`, `created_at`, `updated_at`)
SELECT
	lower(
		hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' ||
		substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))
	),
	t.`id`,
	CAST(strftime('%s', t.`data_inicio` / 1000, 'unixepoch', 'localtime', 'start of day', printf('%+d days', d.`value` - 1), 'utc') AS integer) * 1000,
	t.`criado_por`,
	t.`updated_at`,
	t.`updated_at`
FROM `tratamentos` AS t, json_each(t.`dias_confirmados`) AS d
WHERE d.`type` = 'integer' AND d.`value` >= 1;
