import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { Departement } from '../zones/entities/departement.entity';
import { VigieauLogger } from '../logger/vigieau.logger';
import { DepartementDto } from './dto/departement.dto';
import { Statistic } from '../statistics/entities/statistic.entity';
import { Utils } from '../core/utils';
import { max } from 'lodash';
import { Region } from '../zones/entities/region.entity';
import { BassinVersant } from '../zones/entities/bassin_versant.entity';

@Injectable()
export class DepartementsService {
  private readonly logger = new VigieauLogger('DepartementsService');
  situationDepartements: any[] = [];
  departements: any[];
  regions: Region[];
  bassinsVersants: BassinVersant[];

  constructor(@InjectRepository(Departement)
              private readonly departementRepository: Repository<Departement>,
              @InjectRepository(Statistic)
              private readonly statisticRepository: Repository<Statistic>,
              @InjectRepository(Region)
              private readonly regionRepository: Repository<Region>,
              @InjectRepository(BassinVersant)
              private readonly bassinVersantRepository: Repository<BassinVersant>) {
    this.loadRefData();
  }

  /**
   * Récupère une liste simplifiée des départements.
   * Retourne uniquement les champs nécessaires pour des cas d'usage rapide.
   */
  async getAllLight(): Promise<Departement[]> {
    return this.departementRepository.find(<FindManyOptions>{
      select: {
        id: true,
        code: true,
        region: {
          id: true,
          code: true,
        },
      },
      relations: ['region'],
    });
  }

  /**
   * Retourne la situation des départements pour une date donnée et des critères facultatifs.
   * @param date - Date pour la situation (format YYYY-MM-DD)
   * @param bassinVersant - ID du bassin versant
   * @param region - ID de la région
   * @param departement - ID du département
   */
  situationByDepartement(
    date?: string,
    bassinVersant?: string,
    region?: string,
    departement?: string,
  ): DepartementDto[] {
    const searchDate = date || new Date().toISOString().split('T')[0];

    const situationDepartement = this.situationDepartements.find(s => s.date === searchDate);
    if (!situationDepartement) {
      throw new HttpException(`Date non disponible.`, HttpStatus.NOT_FOUND);
    }

    if (bassinVersant) {
      const b = this.bassinsVersants.find(b => b.id === +bassinVersant);
      if (!b) {
        throw new HttpException(`Bassin versant non trouvé.`, HttpStatus.NOT_FOUND);
      }
      return situationDepartement.departementSituation.filter(d => b.departements.some(dep => dep.code === d.code));
    }

    if (region) {
      const r = this.regions.find(r => r.id === +region);
      if (!r) {
        throw new HttpException(`Région non trouvée.`, HttpStatus.NOT_FOUND);
      }
      return situationDepartement.departementSituation.filter(d => r.departements.some(dep => dep.code === d.code));
    }

    if (departement) {
      const d = this.departements.find(d => d.id === +departement);
      if (!d) {
        throw new HttpException(`Département non trouvé.`, HttpStatus.NOT_FOUND);
      }
      return situationDepartement.departementSituation.filter(ds => d.code === ds.code);
    }
    return situationDepartement.departementSituation;
  }

  /**
   * Charge les données de référence (départements, régions, bassins versants) en mémoire.
   */
  async loadRefData(): Promise<void> {
    this.departements = await this.departementRepository.find({
      order: {
        nom: 'ASC',
      },
    });
    this.regions = await this.regionRepository.find({
      relations: ['departements'],
      order: {
        nom: 'ASC',
      },
    });
    this.bassinsVersants = await this.bassinVersantRepository.find({
      relations: ['departements'],
      order: {
        nom: 'ASC',
      },
    });
  }

  /**
   * Charge la situation des départements en mémoire à partir des statistiques.
   * @param currentZones - Liste des zones actuelles (fournies dynamiquement)
   */
  async loadSituation(currentZones) {
    this.logger.log('LOAD SITUATION DEPARTEMENTS - BEGIN');
    const departements = await this.departementRepository.find(<FindManyOptions>{
      select: {
        id: true,
        code: true,
        nom: true,
        region: {
          nom: true,
        },
      },
      relations: ['region'],
      order: {
        code: 'ASC',
      },
    });

    const statistics = await this.statisticRepository.find({
      select: {
        date: true,
        departementSituation: true,
      },
      order: {
        date: 'ASC',
      },
    });

    this.situationDepartements = statistics.map(s => {
      return {
        date: s.date,
        departementSituation: departements.map(d => {
          let niveauGraviteMax = s.departementSituation && s.departementSituation[d.code] ? s.departementSituation[d.code].max : null;
          let niveauGraviteSupMax = s.departementSituation && s.departementSituation[d.code] ? s.departementSituation[d.code].sup : null;
          let niveauGraviteSouMax = s.departementSituation && s.departementSituation[d.code] ? s.departementSituation[d.code].sou : null;
          let niveauGraviteAepMax = s.departementSituation && s.departementSituation[d.code] ? s.departementSituation[d.code].aep : null;

          if (s.date === new Date().toISOString().split('T')[0]) {
            const depZones = currentZones.filter(z => z.departement === d.code);

            niveauGraviteMax = this.computeMaxGravite(depZones);
            niveauGraviteSupMax = this.computeMaxGravite(depZones, 'SUP');
            niveauGraviteSouMax = this.computeMaxGravite(depZones, 'SOU');
            niveauGraviteAepMax = this.computeMaxGravite(depZones, 'AEP');
          }

          return {
            code: d.code,
            nom: d.nom,
            region: d.region?.nom,
            niveauGraviteMax: niveauGraviteMax,
            niveauGraviteSupMax: niveauGraviteSupMax,
            niveauGraviteSouMax: niveauGraviteSouMax,
            niveauGraviteAepMax: niveauGraviteAepMax,
          };
        }),
      };
    });
    this.logger.log('LOAD SITUATION DEPARTEMENTS - END');
  }

  /**
   * Calcule le niveau de gravité maximal pour une liste de zones données.
   * @param zones - Liste des zones à analyser.
   * @param type - (Optionnel) Type de zone (SUP, SOU, AEP).
   */
  private computeMaxGravite(zones: any[], type?: string): string | null {
    const filteredZones = type ? zones.filter(z => z.type === type) : zones;
    if (filteredZones.length === 0) return null;

    // Transforme les niveaux en valeurs numériques, puis récupère le maximum
    const maxLevel = max(filteredZones.map(z => Utils.getNiveau(z.niveauGravite)));
    return Utils.getNiveauInversed(maxLevel);
  }
}
