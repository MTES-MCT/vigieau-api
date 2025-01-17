import { ConfigService } from '@nestjs/config';
import JwtStrategy from './jwt.strategy';
import { Test, TestingModule } from '@nestjs/testing';

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-secret'; // Simule une clé secrète
              return null;
            }),
          },
        },
      ],
    }).compile();

    jwtStrategy = <JwtStrategy>module.get(JwtStrategy);
    configService = <ConfigService>module.get(ConfigService);
  });

  it('devrait être défini', () => {
    expect(jwtStrategy).toBeDefined();
  });

  it('devrait utiliser la clé secrète depuis ConfigService', () => {
    const secret = configService.get('JWT_SECRET');
    expect(secret).toBe('test-secret');
  });

  describe('validate', () => {
    it('devrait retourner le payload enrichi si valide', async () => {
      const payload = {
        userId: '12345',
        username: 'johndoe',
        roles: ['admin'],
      };

      const result = await jwtStrategy.validate(payload);
      expect(result).toEqual({
        userId: '12345',
        username: 'johndoe',
        roles: ['admin'],
      });
    });
  });
});