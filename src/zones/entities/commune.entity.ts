import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity, ManyToMany,
  OneToMany,
  Polygon,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Restriction } from './restriction.entity';
import { ZoneAlerteComputed } from './zone_alerte_computed.entity';
import { StatisticCommune } from '../../data/entities/statistic_commune.entity';

@Entity()
export class Commune extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false, length: 6 })
  code: string;

  @Column({ nullable: false })
  nom: string;

  @Column({ nullable: true })
  population: number;

  @Column({
    type: 'geometry',
    nullable: true,
    select: false,
  })
  geom: Polygon;

  @ManyToMany(() => Restriction, (restriction) => restriction.communes, {
    persistence: false,
  })
  restrictions: Restriction[];

  @ManyToMany(() => ZoneAlerteComputed, (zoneAlerteComputed) => zoneAlerteComputed.communes, {
    persistence: false,
  })
  zonesAlerteComputed: ZoneAlerteComputed[];

  @Column({ nullable: false, default: false })
  disabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => StatisticCommune, (statisticCommune) => statisticCommune.commune)
  statisticCommune: StatisticCommune[];
}
