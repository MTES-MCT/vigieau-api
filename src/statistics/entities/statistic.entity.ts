import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
@Unique(['date'])
export class Statistic extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', nullable: false })
  date: string;

  @Column({ nullable: true })
  visits: number;

  @Column({ nullable: true })
  restrictionsSearch: number;

  @Column({ nullable: true })
  arreteDownloads: number;

  @Column('json', { nullable: true })
  profileRepartition: any;

  @Column('json', { nullable: true })
  departementRepartition: any;

  @Column('json', { nullable: true })
  regionRepartition: any;

  @Column({ nullable: true })
  subscriptions: number;

  @Column('json', { nullable: true })
  departementSituation: any;
}