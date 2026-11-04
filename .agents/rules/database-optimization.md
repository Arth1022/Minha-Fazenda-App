---
trigger: always_on
description: O foco atual do projeto é a otimização do banco de dados local
---

# Regra: Otimização do Banco de Dados Local

- **Prioridade Máxima**: O foco atual é a otimização do banco de dados local (SQLite / Drizzle ORM).
- **Diretrizes**:
  1. Otimizar schemas, índices e consultas para evitar gargalos em operações de I/O móvel.
  2. Reduzir queries redundantes ou N+1; utilizar transações e batching sempre que cabível.
  3. Preservar a consistência, integridade relacional e tipos rigorosos no Drizzle ORM.
  4. Avaliar o impacto na performance local antes de introduzir novas mutações ou leituras pesadas.
