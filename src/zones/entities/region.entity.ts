import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Departement } from './departement.entity';

@Entity()
export class Region extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false, length: 3 })
  code: string;

  @Column({ nullable: false, length: 255 })
  nom: string;

  @Column({ nullable: false, default: false })
  domOn: boolean;

  @OneToMany(() => Departement, (departements) => departements.region)
  departements: Departement[];
}
