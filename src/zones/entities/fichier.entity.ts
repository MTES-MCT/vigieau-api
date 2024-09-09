import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ArreteRestriction } from './arrete_restriction.entity';
import { ArreteCadre } from './arrete_cadre.entity';
import { ArreteMunicipal } from './arrete_municipal.entity';

@Entity()
export class Fichier extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, length: 100 })
  nom: string;

  @Column({ nullable: false, length: 255 })
  url: string;

  @Column({ nullable: false })
  size: number;

  @CreateDateColumn({ select: false, type: 'timestamp' })
  created_at: number;

  @OneToOne(() => ArreteCadre, (arreteCadre) => arreteCadre.fichier)
  arreteCadre: ArreteCadre;

  @OneToOne(
    () => ArreteRestriction,
    (arreteRestriction) => arreteRestriction.fichier,
  )
  arreteRestriction: ArreteRestriction;

  @OneToOne(
    () => ArreteMunicipal,
    (arreteMunicipal) => arreteMunicipal.fichier,
  )
  arreteMunicipal: ArreteMunicipal;

  @Column({ default: false })
  migrate: boolean;
}
