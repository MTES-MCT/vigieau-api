import { BaseEntity, Check, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
@Check(`id = 1`)
export class Config extends BaseEntity {
  @PrimaryColumn({ type: 'int', default: () => `1`, nullable: false })
  id: number;

  @Column({ type: 'timestamp', nullable: true })
  computeZoneAlerteComputedDate: Date;
}