import {
  BaseEntity,
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  Polygon,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ArreteRestriction } from './arrete_restriction.entity';
import { Region } from './region.entity';
import { StatisticDepartement } from '../../data/entities/statistic_departement.entity';

@Entity()
export class Departement extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false, length: 3 })
  code: string;

  @Column({ nullable: false, length: 60 })
  nom: string;

  @Column({
    type: 'geometry',
    nullable: true,
    select: false,
  })
  geom: Polygon;

  @ManyToOne(() => Region, (region) => region.departements)
  region: Region;

  // @OneToMany(() => Commune, (communes) => communes.departement)
  // communes: Commune[];

  // @OneToMany(() => ZoneAlerte, (zoneAlerte) => zoneAlerte.departement)
  // zonesAlerte: ZoneAlerte[];

  // @OneToMany(() => ZoneAlerteComputed, (zoneAlerteComputed) => zoneAlerteComputed.departement)
  // zoneAlerteComputed: ZoneAlerteComputed[];

  // @ManyToMany(() => ArreteCadre, (arreteCadre) => arreteCadre.departements)
  // arretesCadre: ArreteCadre[];

  // @OneToMany(() => ArreteCadre, (arreteCadre) => arreteCadre.departementPilote)
  // arretesCadrePilote: ArreteCadre[];

  @OneToMany(
    () => ArreteRestriction,
    (arreteRestriction) => arreteRestriction.departement,
  )
  arretesRestriction: ArreteRestriction[];

  // @OneToOne(() => Parametres, (parametres) => parametres.departement)
  // parametres: Parametres;

  @OneToMany(() => StatisticDepartement, (statisticDepartement) => statisticDepartement.departement)
  statisticDepartement: StatisticDepartement[];
}
