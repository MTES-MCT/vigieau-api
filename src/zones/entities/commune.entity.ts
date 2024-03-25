import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity, ManyToMany,
  ManyToOne, OneToMany,
  Polygon,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Restriction } from './restriction.entity';

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

  @Column({ nullable: false, default: false })
  disabled: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
