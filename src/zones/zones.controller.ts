import { Controller, Get, Param, Query } from '@nestjs/common';
import { ZonesService } from './zones.service';

@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  async findAll(
    @Query('lon') lon?: string,
    @Query('lat') lat?: string,
    @Query('commune') commune?: string,
    @Query('profil') profil?: string,
    @Query('zoneType') zoneType?: string,
  ): Promise<any> {
    return this.zonesService.find(lon, lat, commune, profil, zoneType);
  }

  @Get(':id')
  async findOne(@Param('id') id: string,): Promise<any> {
    return this.zonesService.findOne(id);
  }
}
