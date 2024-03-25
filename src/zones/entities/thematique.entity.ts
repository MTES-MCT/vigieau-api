import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usage } from './usage.entity';

@Entity()
export class Thematique extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false, length: 100 })
  nom: string;

  @OneToMany(() => Usage, (usages) => usages.thematique)
  usages: Usage[];
}
