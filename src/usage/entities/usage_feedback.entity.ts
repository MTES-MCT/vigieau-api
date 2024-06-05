import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usage } from '../../zones/entities/usage.entity';

@Entity()
export class UsageFeedback extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usage,
    (usage) => usage.usageFeedbacks,
    { nullable: false })
  usage: Usage;

  @Column({ nullable: true, length: 255 })
  feedback: string;

  @Column({ nullable: false, default: false })
  isView: boolean;

  @CreateDateColumn()
  createdAt: Date;
}