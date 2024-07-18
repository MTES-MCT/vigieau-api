import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Departement } from '../../zones/entities/departement.entity';

@Entity()
@Unique(['departement'])
export class StatisticDepartement extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Departement, (departement) => departement.statisticDepartement)
  departement: Departement;

  @Column('jsonb',{ nullable: true })
  visits: any[];

  @Column('jsonb',{ nullable: true })
  restrictions: any[];

  @Column({ nullable: false })
  totalVisits: number;

  @Column({ nullable: false })
  weekVisits: number;

  @Column({ nullable: false })
  monthVisits: number;

  @Column({ nullable: false })
  yearVisits: number;

  @Column({ nullable: false })
  subscriptions: number;
}