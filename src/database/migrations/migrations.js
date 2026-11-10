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
import m0010 from './0010_animais_crias_anteriores.sql';
import m0011 from './0011_indices_status_ordenha.sql';
import m0012 from './0012_talhoes.sql';
import m0013 from './0013_maquinas.sql';
import m0014 from './0014_rebanho_dados_extras.sql';
import m0015 from './0015_auditoria_maquinas.sql';
import m0016 from './0016_divisa_fazenda_config.sql';
import m0017 from './0017_agricultura_mapa.sql';
import m0018 from './0018_areas_no_mapa.sql';
import m0019 from './0019_rebanho_no_mapa.sql';
import m0020 from './0020_lotes_pasto.sql';
import m0021 from './0021_cerca_na_area.sql';
import m0022 from './0022_plantio_na_area.sql';
import m0023 from './0023_trajetos_por_area.sql';

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
m0009,
m0010,
m0011,
m0012,
m0013,
m0014,
m0015,
m0016,
m0017,
m0018,
m0019,
m0020,
m0021,
m0022,
m0023
    }
  }
  