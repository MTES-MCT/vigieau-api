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
import { ZoneAlerteComputed } from './zone_alerte_computed.entity';
import { Usage } from './usage.entity';
import { Commune } from './commune.entity';
import { ArreteRestriction } from './arrete_restriction.entity';
import { ArreteCadre } from './arrete_cadre.entity';

@Entity()
@Unique(['arreteRestriction'])
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

  @OneToMany(() => ZoneAlerteComputed, (zoneAlerteComputed) => zoneAlerteComputed.restriction)
  zonesAlerteComputed: ZoneAlerteComputed[];

  @ManyToOne(() => ArreteCadre, (arreteCadre) => arreteCadre.restrictions)
  arreteCadre: ArreteCadre;

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
