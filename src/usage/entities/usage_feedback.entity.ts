import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ArreteRestriction } from '../../zones/entities/arrete_restriction.entity';

@Entity()
export class UsageFeedback extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ArreteRestriction,
    (arreteRestriction) => arreteRestriction.usageFeedbacks,
    { nullable: false, onDelete: 'CASCADE' })
  arreteRestriction: ArreteRestriction;

  @Column({ nullable: true, length: 255 })
  usageNom: string;

  @Column({ nullable: true, length: 255 })
  usageThematique: string;

  @Column({ nullable: true, length: 3000 })
  usageDescription: string;

  @Column({ nullable: true, length: 255 })
  feedback: string;

  @Column({ nullable: false, default: false })
  archived: boolean;

  @CreateDateColumn()
  createdAt: Date;
}