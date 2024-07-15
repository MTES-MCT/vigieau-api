import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity, JoinTable, ManyToMany, ManyToOne, OneToMany,
  Polygon,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Restriction } from './restriction.entity';
import { NiveauGravite } from '../type/niveau_gravite.type';
import { Commune } from './commune.entity';

@Entity()
export class ZoneAlerteComputed extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  idSandre: number;

  @Column({ nullable: false, length: 200 })
  nom: string;

  @Column({ nullable: false, length: 32 })
  code: string;

  @Column({ nullable: false, length: 50 })
  type: 'SOU' | 'SUP' | 'AEP';

  @Column({ default: false })
  enabled: boolean;

  @Column({
    type: 'geometry',
    nullable: false,
    select: false,
  })
  geom: Polygon;

  @Column('enum', {
    name: 'niveauGravite',
    enum: ['vigilance', 'alerte', 'alerte_renforcee', 'crise'],
    nullable: true,
  })
  niveauGravite: NiveauGravite;

  // @ManyToOne(() => Departement, (departement) => departement.zonesAlerte)
  // departement: Departement;
  //
  // @ManyToOne(() => BassinVersant, (bassinVersant) => bassinVersant.zonesAlerte)
  // bassinVersant: BassinVersant;

  // @ManyToMany(() => ArreteCadre, (arreteCadre) => arreteCadre.zonesAlerte)
  // arretesCadre: ArreteCadre[];

  @ManyToOne(() => Restriction, (restriction) => restriction.zonesAlerteComputed)
  restriction: Restriction;

  @ManyToMany(() => Commune, (commune) => commune.zonesAlerteComputed)
  @JoinTable({
    name: 'zone_alerte_computed_commune',
  })
  communes: Commune[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
