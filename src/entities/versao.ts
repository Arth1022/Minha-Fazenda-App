/**
 * Versão do schema local, enviada em todo `POST /sync/upload`. Some 1 a cada
 * mudança de schema (com a linha correspondente no SCHEMA_CHANGES.md): a API
 * recusa com 426 um app abaixo da versão mínima que ela ainda aceita.
 */
export const SCHEMA_VERSION = 2; // 2: sem animais.racao_kg_dia (SC-050)
