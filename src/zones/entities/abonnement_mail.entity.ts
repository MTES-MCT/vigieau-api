import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ nullable: true })
  idAdresse: string;

  @Column({ nullable: false })
  libelleLocalisation: string;

  @Column('simple-array', { nullable: false, array: true })
  typesEau: string[];

  @Column('json', { nullable: false })
  situation: {
    aep: string;
    eso: string,
    esu: string,
  };

  @CreateDateColumn({ select: false, type: 'timestamp' })
  createdAt: number;
}