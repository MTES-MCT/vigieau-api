import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Commune } from '../../zones/entities/commune.entity';

@Entity()
@Unique(['commune'])
export class StatisticCommune extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Commune, (commune) => commune.statisticCommune)
  commune: Commune;

  @Column('jsonb',{ nullable: true })
  restrictions: any[];

  @Column('jsonb',{ nullable: true })
  restrictionsByMonth: any[];
}