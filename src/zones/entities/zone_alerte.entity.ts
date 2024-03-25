import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity, ManyToMany, OneToMany,
  Polygon,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Restriction } from './restriction.entity';
import { ArreteCadre } from './arrete_cadre.entity';

@Entity()
export class ZoneAlerte extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, length: 200 })
  nom: string;

  @Column({ nullable: false, length: 32 })
  code: string;

  @Column({ nullable: false, length: 50 })
  type: 'SOU' | 'SUP';

  @Column({ nullable: false })
  numeroVersion: number;

  @Column({ nullable: true })
  numeroVersionSandre: number;

  @Column({
    type: 'geometry',
    nullable: false,
    select: false,
  })
  geom: Polygon;

  @Column({ nullable: false, default: false })
  disabled: boolean;

  // @ManyToOne(() => Departement, (departement) => departement.zonesAlerte)
  // departement: Departement;
  //
  // @ManyToOne(() => BassinVersant, (bassinVersant) => bassinVersant.zonesAlerte)
  // bassinVersant: BassinVersant;
  //
  @ManyToMany(() => ArreteCadre, (arreteCadre) => arreteCadre.zonesAlerte)
  arretesCadre: ArreteCadre[];

  @OneToMany(() => Restriction, (restriction) => restriction.zoneAlerte)
  restrictions: Restriction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
