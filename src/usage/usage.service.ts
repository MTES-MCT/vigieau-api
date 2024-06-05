import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usage } from '../zones/entities/usage.entity';

@Injectable()
export class UsageService {
  constructor(@InjectRepository(Usage)
              private readonly usageRepository: Repository<Usage>) {
  }

  feedback() {

  }
}
