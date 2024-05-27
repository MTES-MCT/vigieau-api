import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class AbonnementMail extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, length: 255 })
  email: string;

  @Column({ nullable: false, length: 255 })
  ip: string;

  @Column('enum', {
    name: 'profil',
    enum: ['particulier', 'entreprise', 'collectivite', 'exploitation'],
    default: 'particulier',
    nullable: false,
  })
  profil: 'particulier' | 'entreprise' | 'collectivite' | 'exploitation';

  @Column({ nullable: true, length: 6 })
  commune: string;

  @Column({ nullable: true, type: 'decimal' })
  lon: number;

  @Column({ nullable: true, type: 'decimal' })
  lat: number;

  @Column({ nullable: true })
  idAdresse: string;

  @Column({ nullable: false })
  libelleLocalisation: string;

  @Column('simple-array', { nullable: false, array: true })
  typesEau: string[];

  @Column('json', { nullable: false })
  situation: {
    AEP: string;
    SOU: string,
    SUP: string,
  };

  @CreateDateColumn({ select: false, type: 'timestamp' })
  createdAt: number;

  @UpdateDateColumn()
  updatedAt: Date;
}