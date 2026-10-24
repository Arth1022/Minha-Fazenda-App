// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_tratamentos.sql';
import m0001 from './0001_rebanho_e_ordenha.sql';
import m0002 from './0002_remove_campos_antigos.sql';
import m0003 from './0003_rebanho_completo.sql';
import m0004 from './0004_notificacoes_agendadas.sql';
import m0005 from './0005_animais_ja_pariu.sql';
import m0006 from './0006_animais_leite_racao.sql';
import m0007 from './0007_sprint2_agenda_doses_pai.sql';
import m0008 from './0008_copia_dias_confirmados.sql';
import m0009 from './0009_tratamentos_observacoes.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005,
m0006,
m0007,
m0008,
m0009
    }
  }
  