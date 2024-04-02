import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Fichier } from './fichier.entity';
import { ArreteRestriction } from './arrete_restriction.entity';
import { Usage } from './usage.entity';
import { Restriction } from './restriction.entity';

@Entity()
export class ArreteCadre extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, length: 50 })
  numero: string;

  @Column({ type: 'date', nullable: true })
  dateDebut: string;

  @Column({ type: 'date', nullable: true })
  dateFin: string;

  @OneToOne(() => Fichier, (fichier) => fichier.arreteCadre)
  @JoinColumn()
  fichier: Fichier;

  // @ManyToOne(() => Departement, (departement) => departement.arretesCadrePilote)
  // departementPilote: Departement;

  // @Column('enum', {
  //   name: 'statut',
  //   enum: ['a_valider', 'a_venir', 'publie', 'abroge'],
  //   default: 'a_valider',
  //   nullable: false,
  // })
  // statut: StatutArreteCadre;

  // @Column('enum', {
  //   name: 'communeNiveauGraviteMax',
  //   enum: ['all', 'aep', 'none'],
  //   nullable: true,
  // })
  // communeNiveauGraviteMax: CommuneNiveauGraviteMax;

  @Column({ nullable: true })
  niveauGraviteSpecifiqueEap: boolean;

  // @Column('enum', {
  //   name: 'ressourceEapCommunique',
  //   enum: ['esu', 'eso', 'max'],
  //   nullable: true,
  // })
  // ressourceEapCommunique: RessourceEapCommunique;

  @ManyToMany(
    () => ArreteRestriction,
    (ArreteRestriction) => ArreteRestriction.arretesCadre,
  )
  @JoinTable({
    name: 'arrete_cadre_arrete_restriction',
  })
  arretesRestriction: ArreteRestriction[];

  // @ManyToMany(() => Departement, (departement) => departement.arretesCadre)
  // @JoinTable({
  //   name: 'arrete_cadre_departement',
  // })
  // departements: Departement[];

  // @ManyToMany(() => ZoneAlerte, (zoneAlerte) => zoneAlerte.arretesCadre)
  // @JoinTable({
  //   name: 'arrete_cadre_zone_alerte',
  // })
  // zonesAlerte: ZoneAlerte[];

  @OneToMany(
    () => Usage,
    (usages) => usages.arreteCadre,
    { persistence: false },
  )
  usages: Usage[];

  @ManyToOne(() => ArreteCadre, (arreteCadre) => arreteCadre.arretesCadre)
  arreteCadreAbroge: ArreteCadre;

  @OneToMany(() => ArreteCadre, (arreteCadre) => arreteCadre.arreteCadreAbroge)
  arretesCadre: ArreteCadre[];

  @OneToMany(() => Restriction, (restriction) => restriction.arreteCadre)
  restrictions: Restriction[];

  @CreateDateColumn({ select: false, type: 'timestamp' })
  created_at: number;

  @UpdateDateColumn({ select: false, type: 'timestamp' })
  updated_at: number;
}
