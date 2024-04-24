import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
@Unique(['date'])
export class Statistic extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', nullable: false })
  date: string;

  @Column({ nullable: false })
  visits: number;

  @Column({ nullable: false })
  restrictionsSearch: number;

  @Column({ nullable: false })
  arreteDownloads: number;

  @Column('json', { nullable: false })
  profileRepartition: any;

  @Column('json', { nullable: false })
  departementRepartition: any;

  @Column('json', { nullable: false })
  regionRepartition: any;

  @Column({ nullable: false })
  subscriptions: number;
}