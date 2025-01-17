import { Test, TestingModule } from '@nestjs/testing';
import { ZonesController } from './zones.controller';
import { ZonesService } from './zones.service';
import { ZoneDto } from './dto/zone.dto';

describe('ZonesController', () => {
  let zonesController: ZonesController;
  let zonesService: ZonesService;

  const mockZone: ZoneDto = {
    id: 1,
    idSandre: 123,
    gid: 456,
    code: '01_ZONE_SUP',
    CdZAS: '01_ZONE_SUP',
    nom: 'Zone de test',
    LbZAS: 'Zone de test',
    type: 'SUP',
    TypeZAS: 'SUP',
    ressourceInfluencee: true,
    niveauGravite: 'alerte',
    departement: '01',
    arrete: null,
    arreteMunicipalCheminFichier: null,
    usages: [],
  };

  const mockZonesService = {
    find: jest.fn(),
    findOne: jest.fn(),
    findByDepartement: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZonesController],
      providers: [{ provide: ZonesService, useValue: mockZonesService }],
    }).compile();

    zonesController = <ZonesController> module.get(ZonesController);
    zonesService = <ZonesService> module.get(ZonesService);
  });

  it('should be defined', () => {
    expect(zonesController).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of zones when called with valid query parameters', async () => {
      const mockResult = [mockZone];
      mockZonesService.find.mockResolvedValue(mockResult);

      const query = { lon: '2.123', lat: '48.123', commune: undefined, profil: undefined, zoneType: undefined };
      const result = await zonesController.findAll(query);

      expect(zonesService.find).toHaveBeenCalledWith(query.lon, query.lat, query.commune, query.profil, query.zoneType);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should return a zone when called with a valid id', async () => {
      mockZonesService.findOne.mockResolvedValue(mockZone);

      const result = await zonesController.findOne(1);

      expect(zonesService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockZone);
    });
  });

  describe('findByDepartement', () => {
    it('should return a list of zones for a valid department code', async () => {
      const mockResult = [mockZone];
      mockZonesService.findByDepartement.mockResolvedValue(mockResult);

      const result = await zonesController.findByDepartement('01');

      expect(zonesService.findByDepartement).toHaveBeenCalledWith('01');
      expect(result).toEqual(mockResult);
    });
  });
});