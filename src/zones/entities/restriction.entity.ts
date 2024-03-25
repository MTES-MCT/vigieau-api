import {
  BaseEntity,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ZoneAlerte } from './zone_alerte.entity';
import { Usage } from './usage.entity';
import { Commune } from './commune.entity';
import { ArreteRestriction } from './arrete_restriction.entity';

@Entity()
@Unique(['arreteRestriction', 'zoneAlerte'])
export class Restriction extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, length: 255 })
  nomGroupementAep: string;

  @ManyToOne(
    () => ArreteRestriction,
    (arreteRestriction) => arreteRestriction.restrictions,
    { nullable: false, persistence: false, onDelete: 'CASCADE' },
  )
  arreteRestriction: ArreteRestriction;

  @ManyToOne(() => ZoneAlerte, (zoneAlerte) => zoneAlerte.restrictions)
  zoneAlerte: ZoneAlerte;

  @Column('enum', {
    name: 'niveauGravite',
    enum: ['vigilance', 'alerte', 'alerte_renforcee', 'crise'],
    nullable: true,
  })
  niveauGravite: string;

  @OneToMany(
    () => Usage,
    (usages) => usages.restriction,
    { persistence: false },
  )
  usages: Usage[];

  @ManyToMany(() => Commune, (commune) => commune.restrictions)
  @JoinTable({
    name: 'restriction_commune',
  })
  communes: Commune[];
}
