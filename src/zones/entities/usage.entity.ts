import {
  BaseEntity,
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn, Unique,
} from 'typeorm';
import { Thematique } from './thematique.entity';
import { Restriction } from './restriction.entity';
import { ArreteCadre } from './arrete_cadre.entity';

@Entity()
@Unique(['nom', 'thematique', 'arreteCadre'])
@Unique(['nom', 'thematique', 'restriction'])
export class Usage extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, length: 255 })
  nom: string;

  @ManyToOne(() => Thematique,
    (thematique) => thematique.usages,
    { nullable: false })
  @Index()
  thematique: Thematique;

  @Column({ default: false })
  isTemplate: boolean;

  @Column({ nullable: true })
  concerneParticulier: boolean;

  @Column({ nullable: true })
  concerneEntreprise: boolean;

  @Column({ nullable: true })
  concerneCollectivite: boolean;

  @Column({ nullable: true })
  concerneExploitation: boolean;

  @Column({ default: true })
  concerneEso: boolean;

  @Column({ default: true })
  concerneEsu: boolean;

  @Column({ default: true })
  concerneAep: boolean;

  @Column({ nullable: true, length: 3000 })
  descriptionVigilance: string;

  @Column({ nullable: true, length: 3000 })
  descriptionAlerte: string;

  @Column({ nullable: true, length: 3000 })
  descriptionAlerteRenforcee: string;

  @Column({ nullable: true, length: 3000 })
  descriptionCrise: string;

  @ManyToOne(
    () => ArreteCadre,
    (arreteCadre) => arreteCadre.usages,
    { nullable: true, persistence: false, onDelete: 'CASCADE' },
  )
  @Index()
  arreteCadre: ArreteCadre;

  @ManyToOne(
    () => Restriction,
    (restriction) => restriction.usages,
    { nullable: true, persistence: false, onDelete: 'CASCADE' },
  )
  @Index()
  restriction: Restriction;
}
