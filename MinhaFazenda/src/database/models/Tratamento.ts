import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type Animal from './Animal';

export default class Tratamento extends Model {
  static table = 'tratamentos';

  static associations = {
    animais: { type: 'belongs_to' as const, key: 'animal_id' },
  };

  @field('animal_id') animalId!: string;
  @field('medicamento') medicamento!: string;
  @date('data_inicio') dataInicio!: Date;
  @date('data_fim') dataFim?: Date;
  @field('dias_confirmados') diasConfirmados?: string; // JSON array ex: "[1, 2, 3]"
  @date('proxima_dose_em') proximaDoseEm?: Date;
  @field('notificacao_ativa') notificacaoAtiva?: boolean;

  // Relacionamento tipado com Animal
  @relation('animais', 'animal_id') animal!: Relation<Animal>;

  @readonly @date('criado_em') criadoEm!: Date;
  @readonly @date('atualizado_em') atualizadoEm!: Date;
}
