import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { VigieauLogger } from '../logger/vigieau.logger';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { StatisticDepartement } from './entities/statistic_departement.entity';
import moment from 'moment';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Region } from '../zones/entities/region.entity';
import { BassinVersant } from '../zones/entities/bassin_versant.entity';
import { StatisticCommune } from './entities/statistic_commune.entity';
import { Commune } from '../zones/entities/commune.entity';
import { Departement } from '../zones/entities/departement.entity';

@Injectable()
export class DataService {
  private readonly logger = new VigieauLogger('DataService');

  private data: any[] = [];
  private dataArea: any[] = [];
  private dataCommune: any[] = [];
  private dataDepartement: any[] = [];
  private communes: any[] = [];
  private departements: any[] = [];
  private regions: Region[] = [];
  private bassinsVersants: BassinVersant[] = [];
  private fullArea: number = 0;
  private metropoleArea: number = 0;

  private readonly releaseDate = '2023-07-11';
  private readonly beginDate = '2013-01-01';

  constructor(@InjectRepository(StatisticDepartement)
              private readonly statisticDepartementRepository: Repository<StatisticDepartement>,
              @InjectRepository(StatisticCommune)
              private readonly statisticCommuneRepository: Repository<StatisticCommune>,
              @InjectRepository(Commune)
              private readonly communeRepository: Repository<Commune>,
              @InjectRepository(Departement)
              private readonly departementRepository: Repository<Departement>,
              @InjectRepository(Region)
              private readonly regionRepository: Repository<Region>,
              @InjectRepository(BassinVersant)
              private readonly bassinVersantRepository: Repository<BassinVersant>,
              private dataSource: DataSource,
  ) {
  }

  /**
   * Retourne les données de référence pour les filtres (bassins versants, régions, départements).
   * Ces données sont structurées pour faciliter leur utilisation dans des interfaces utilisateur.
   */
  getRefData() {
    return {
      bassinsVersants: this.formatEntities(this.bassinsVersants, 'departements'),
      regions: this.formatEntities(this.regions, 'departements'),
      departements: this.departements.map(d => {
        return {
          id: d.id,
          code: d.code,
          nom: d.nom,
          bounds: d.bounds,
        };
      }),
    };
  }

  /**
   * Formate les entités comme les bassins versants et les régions pour inclure uniquement
   * les champs nécessaires, notamment les relations avec d'autres entités.
   * @param entities - La liste des entités à formater (par exemple : bassins versants).
   * @param relatedField - Le champ relationnel à inclure dans le formatage (par exemple : 'departements').
   */
  private formatEntities(entities: any[], relatedField: string) {
    return entities
      .filter(entity => entity[relatedField] && entity[relatedField].length > 0)
      .map(entity => ({
        id: entity.id,
        code: entity.code,
        nom: entity.nom,
        [relatedField]: entity[relatedField].map((rel: any) => ({
          id: rel.id,
          code: rel.code,
        })),
      }));
  }

  /**
   * Filtre les données de surface (area) par date et critères géographiques
   * comme le bassin versant, la région ou le département.
   * @param dateDebut - Date de début de la plage de recherche (optionnelle).
   * @param dateFin - Date de fin de la plage de recherche (optionnelle).
   * @param bassinVersant - ID du bassin versant (optionnel).
   * @param region - ID de la région (optionnel).
   * @param departement - ID du département (optionnel).
   * @returns Les données filtrées selon les critères.
   */
  areaFindByDate(dateDebut?: string, dateFin?: string, bassinVersant?: string, region?: string, departement?: string) {
    // Filtrage des données par date
    const filteredData = this.filterDataByDate(this.dataArea, dateDebut, dateFin);

    // Filtrer par bassin versant, région ou département
    if (bassinVersant) return this.filterByEntity(filteredData, bassinVersant, 'bassinsVersants');
    if (region) return this.filterByEntity(filteredData, region, 'regions');
    if (departement) return this.filterByEntity(filteredData, departement, 'departements');

    // Données globales
    return filteredData.map(d => ({
      date: d.date,
      ESO: d.ESO,
      ESU: d.ESU,
      AEP: d.AEP,
    }));
  }

  /**
   * Filtre les données par entité géographique (bassin versant, région, département).
   * @param data - Les données à filtrer.
   * @param entityId - L'ID de l'entité géographique à utiliser pour le filtre.
   * @param field - Le champ correspondant à l'entité (ex : 'bassinsVersants', 'regions').
   */
  private filterByEntity(data: any[], entityId: string, field: string) {
    const entity = this[field].find(e => e.id === +entityId);
    if (!entity) {
      throw new HttpException(`${field.slice(0, -1)} non trouvé.`, HttpStatus.NOT_FOUND);
    }

    return data.map(d => ({
      date: d.date,
      ...d[field].find((item: any) => item.id === entity.id),
    }));
  }

  /**
   * Filtre les données par plage de dates.
   * Si aucune date n'est spécifiée, la plage par défaut est définie entre `beginDate` et aujourd'hui.
   * @param data - Les données à filtrer.
   * @param dateDebut - Date de début de la plage de recherche (optionnelle).
   * @param dateFin - Date de fin de la plage de recherche (optionnelle).
   */
  private filterDataByDate(data: any[], dateDebut?: string, dateFin?: string) {
    return structuredClone(data.filter(d =>
      moment(d.date).isBetween(
        moment(dateDebut || this.beginDate, 'YYYY-MM-DD'),
        moment(dateFin || moment(), 'YYYY-MM-DD'),
        undefined,
        '[]',
      ),
    ));
  }

  /**
   * Récupère les statistiques d'un département selon des critères comme les plages de dates
   * ou les entités géographiques (bassins versants, régions).
   * @param dateDebut - Date de début de la plage de recherche (optionnelle).
   * @param dateFin - Date de fin de la plage de recherche (optionnelle).
   * @param bassinVersant - ID du bassin versant (optionnel).
   * @param region - ID de la région (optionnel).
   * @param departement - ID du département (optionnel).
   * @returns Les statistiques du département filtrées.
   */
  departementFindByDate(
    dateDebut?: string,
    dateFin?: string,
    bassinVersant?: string,
    region?: string,
    departement?: string,
  ) {
    let dataDepartementFiltered = this.filterDataByDate(this.dataDepartement, dateDebut, dateFin);

    const departementsToFilter = this.getDepartementsToFilter(bassinVersant, region, departement);
    if (departementsToFilter.length > 0) {
      dataDepartementFiltered = dataDepartementFiltered.map(d => {
        d.departements = d.departements.filter(dep =>
          departementsToFilter.some(depf => depf.code === dep.code),
        );
        return d;
      });
    }
    return dataDepartementFiltered;
  }

  /**
   * Récupère une liste de départements correspondant aux critères géographiques (bassin, région, département).
   * @param bassinVersant - ID du bassin versant (optionnel).
   * @param region - ID de la région (optionnel).
   * @param departement - ID du département (optionnel).
   * @returns Une liste de départements correspondant aux critères.
   */
  private getDepartementsToFilter(bassinVersant?: string, region?: string, departement?: string) {
    if (bassinVersant) {
      return this.getEntityById(this.bassinsVersants, bassinVersant, 'Bassin versant').departements;
    }
    if (region) {
      return this.getEntityById(this.regions, region, 'Région').departements;
    }
    if (departement) {
      return [this.getEntityById(this.departements, departement, 'Département')];
    }
    return [];
  }

  /**
   * Recherche une entité (ex : bassin versant, région, département) par son ID.
   * @param collection - La liste des entités à rechercher.
   * @param id - L'ID de l'entité recherchée.
   * @param entityName - Nom de l'entité (pour les erreurs).
   * @returns L'entité correspondante ou une erreur si elle n'est pas trouvée.
   */
  private getEntityById(collection: any[], id: string, entityName: string) {
    const entity = collection.find(e => e.id === +id);
    if (!entity) {
      throw new HttpException(`${entityName} non trouvé.`, HttpStatus.NOT_FOUND);
    }
    return entity;
  }

  /**
   * Calcule les données de surface (area) et les restrictions associées pour différents niveaux géographiques.
   * Cette méthode est utilisée pour préparer les données avant leur exposition via des API.
   */
  computeDataArea() {
    this.logger.log('COMPUTE DATA AREA');
    this.dataArea = this.data.map(data => {
      return {
        date: data.date,
        ESO: this.computeRestriction(data.departements, 'SOU', this.fullArea),
        ESU: this.computeRestriction(data.departements, 'SUP', this.fullArea),
        AEP: this.computeRestriction(data.departements, 'AEP', this.fullArea),
        bassinsVersants: this.computeEntityRestrictions(data, this.bassinsVersants),
        regions: this.computeEntityRestrictions(data, this.regions),
        departements: this.computeEntityRestrictions(data, this.departements),
      }
    });
  }

  /**
   * Calcule les restrictions pour un ensemble d'entités (bassins versants, régions, départements).
   */
  private computeEntityRestrictions(data: any, entities: any[]) {
    return entities.map(entity => {
      const filteredDeps = this.departements.filter(dep =>
        entity.departements?.some(d => d.id === dep.id),
      );
      const area = filteredDeps.reduce((acc, dep) => acc + dep.area, 0);
      const restrictions = data.departements.filter(dep =>
        filteredDeps.some(d => d.code === dep.departement),
      );
      return {
        id: entity.id,
        ESO: this.computeRestriction(restrictions, 'SOU', area),
        ESU: this.computeRestriction(restrictions, 'SUP', area),
        AEP: this.computeRestriction(restrictions, 'AEP', area),
      };
    });
  }

  /**
   * Calcule un pourcentage de restriction pour un type de zone (ex : SUP, SOU, AEP).
   */
  private computeRestriction(restrictions: any[], zoneType: string, area: number) {
    const compute = (key: string) =>
      (
        (restrictions.reduce((acc, r) => acc + Number(r[zoneType]?.[key] || 0), 0) * 100) / area
      ).toFixed(2);

    return {
      vigilance: compute('vigilance'),
      alerte: compute('alerte'),
      alerte_renforcee: compute('alerte_renforcee'),
      crise: compute('crise'),
    };
  }

  /**
   * Retourne les données communes (pré-calculées).
   */
  duree() {
    return this.dataCommune;
  }

  /**
   * Récupérer les statistiques pour une commune donnée et éventuellement filtrer par date.
   *
   * @param code - Code INSEE de la commune.
   * @param dateDebut - (Optionnel) Début de la plage de dates (format YYYY-MM).
   * @param dateFin - (Optionnel) Fin de la plage de dates (format YYYY-MM).
   * @returns Les statistiques de la commune, incluant les restrictions filtrées si applicable.
   */
  async commune(code: string, dateDebut?: string, dateFin?: string): Promise<StatisticCommune> {
    const stat = await this.statisticCommuneRepository.findOne(<FindOneOptions>{
      select: {
        id: true,
        restrictions: !dateDebut && !dateFin,
        commune: {
          id: true,
          code: true,
          nom: true,
        },
      },
      relations: ['commune'],
      where: {
        commune: {
          code: code,
        },
      },
    });

    // Vérification si la commune existe
    if (!stat) {
      throw new HttpException(
        `Commune avec le code "${code}" non trouvée.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (dateDebut || dateFin) {
      const dateBegin = dateDebut ? moment(dateDebut, 'YYYY-MM').startOf('month') : moment();
      const dateEnd = dateFin ? moment(dateFin, 'YYYY-MM').endOf('month') : moment();

      const r = await this.dataSource.query(`
      SELECT jsonb_agg(r) as filtered_restrictions
      FROM statistic_commune,
  jsonb_array_elements(restrictions) AS r
      WHERE statistic_commune.id = $1 
      AND (r->>'date')::date BETWEEN $2 AND $3
    `, [stat.id, dateBegin.format('YYYY-MM-DD'), dateEnd.format('YYYY-MM-DD')]);

      stat.restrictions = r[0].filtered_restrictions;
    }
    return stat;
  }

  /**
   * Tâche cron exécutée toutes les 3 heures pour charger les données.
   * Cette tâche gère le chargement des données de référence, la mémoire utilisée
   * et prépare les données nécessaires pour les départements et les communes.
   */
  @Cron(CronExpression.EVERY_3_HOURS)
  async loadData() {
    this.logger.log('LOAD DATA');
    await this.loadRefData();
    this.logMemoryUsage();

    this.data = this.generateDateRange(this.beginDate, moment().format('YYYY-MM-DD'));

    await this.loadDepartementData();
    this.data = [];

    await this.loadCommuneData();
  }

  /**
   * Génère une plage de dates quotidienne entre deux dates.
   *
   * @param startDate - Date de début (format YYYY-MM-DD).
   * @param endDate - Date de fin (format YYYY-MM-DD).
   * @returns Un tableau d'objets contenant des dates et des départements/communes initialisés.
   */
  private generateDateRange(startDate: string, endDate: string): any[] {
    const start = moment(startDate, 'YYYY-MM-DD');
    const end = moment(endDate, 'YYYY-MM-DD');
    const dates = [];

    while (start.isSameOrBefore(end, 'day')) {
      dates.push({ date: start.format('YYYY-MM-DD'), departements: [], communes: [] });
      start.add(1, 'day');
    }

    return dates;
  }

  /**
   * Charge les données de référence, y compris les communes, départements, régions et bassins versants.
   * Ces données servent de base à d'autres traitements ou filtrages dans le service.
   */
  async loadRefData() {
    this.communes = await this.communeRepository.find({
      select: {
        id: true,
        code: true,
        nom: true,
      },
      order: {
        code: 'ASC',
      },
    });
    this.departements = (await this.departementRepository
      .createQueryBuilder('departement')
      .select('departement.id', 'id')
      .addSelect('departement.code', 'code')
      .addSelect('departement.nom', 'nom')
      .addSelect(
        'ST_Area(departement.geom::geography)/1000000',
        'area')
      .addSelect('ST_Extent(departement.geom)', 'bounds')
      .groupBy('id')
      .orderBy('nom', 'ASC')
      .getRawMany()).map(d => {
      const bounds = {
        minLat: d.bounds.split('(')[1].split(' ')[0],
        maxLat: d.bounds.split(',')[1].split(' ')[0],
        minLong: d.bounds.split(' ')[1].split(',')[0],
        maxLong: d.bounds.split(' ')[2].split(')')[0],
      };
      d.bounds = bounds;
      return d;
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
    this.fullArea = this.departements.reduce((acc, d) => acc + d.area, 0);
    this.metropoleArea = this.departements.filter(d => d.code.length < 3).reduce((acc, d) => acc + d.area, 0);
  }

  /**
   * Charge les données départementales à partir de la base de données et les associe aux dates correspondantes.
   */
  async loadDepartementData() {
    let statisticsDepartement = await this.statisticDepartementRepository.find({
      relations: ['departement'],
    });

    for (const statisticDepartement of statisticsDepartement) {
      for (const restriction of statisticDepartement.restrictions) {
        const d = this.data.find(x => x.date === restriction.date);
        d.departements.push({
          ...{ departement: statisticDepartement.departement.code },
          ...restriction,
        });
      }
    }

    this.computeDataArea();
    this.logMemoryUsage();

    this.computeDataDepartement();
    this.logMemoryUsage();

    for (const d of this.data) {
      d.departements = [];
    }
  }

  /**
   * Charge les données communales en utilisant un traitement paginé pour limiter l'utilisation de la mémoire.
   */
  async loadCommuneData() {
    this.logger.log('COMPUTE DATA COMMUNE - BEGIN');
    this.dataCommune = [];
    const communesCount = await this.statisticCommuneRepository.count();

    for (let i = 0; i < communesCount; i = i + 1000) {
      for (const d of this.data) {
        d.communes = [];
      }
      let statisticsCommune = await this.statisticCommuneRepository.find(<FindManyOptions> {
        select: {
          id: true,
          restrictionsByMonth: true,
          commune: {
            id: true,
            code: true,
          },
        },
        relations: ['commune'],
        take: 1000,
        skip: i,
      });

      this.computeDataCommune(statisticsCommune);
    }

    this.logger.log('COMPUTE DATA COMMUNE - END');
    this.logMemoryUsage();
  }

  /**
   * Prépare les statistiques des communes à partir des données récupérées.
   *
   * @param statisticsCommune - Les données statistiques des communes.
   */
  computeDataDepartement() {
    this.logger.log('COMPUTE DATA DEPARTEMENT');
    this.dataDepartement = [];
    for (const d of this.data) {
      const tmp = {
        date: d.date,
        departements: [],
      };
      this.departements.forEach(departement => {
        tmp.departements.push({
          code: departement.code,
          niveauGravite: this.findMaxNiveauGravite(d.departements, departement.code),
          niveauGraviteSup: this.findMaxNiveauGravite(d.departements, departement.code, 'SUP'),
          niveauGraviteSou: this.findMaxNiveauGravite(d.departements, departement.code, 'SOU'),
          niveauGraviteAep: this.findMaxNiveauGravite(d.departements, departement.code, 'AEP'),
        });
      });
      this.dataDepartement.push(tmp);
    }
  }

  /**
   * Prépare les statistiques des communes à partir des données récupérées.
   *
   * @param statisticsCommune - Les données statistiques des communes.
   */
  computeDataCommune(statisticsCommune) {
    const communesFiltered = this.communes.filter(c => statisticsCommune.some(sc => sc.commune.code === c.code));
    this.logger.log('COMMUNES FILTERED', communesFiltered.length);
    for (const sc of statisticsCommune) {
      this.dataCommune.push({
        code: sc.commune.code,
        restrictions: sc.restrictionsByMonth?.map(r => {
          return {
            d: r.date,
            p: r.ponderation,
          };
        }),
      });
    }
  }

  /**
   * Trouve le niveau maximal de gravité pour un département donné, et éventuellement pour un type de zone spécifique.
   *
   * @param restrictions - Tableau de restrictions pour différents départements.
   * @param departementCode - Code du département pour lequel trouver le niveau de gravité.
   * @param zoneType - (Optionnel) Type de zone spécifique (ex: 'SUP', 'SOU', 'AEP').
   * @returns Le niveau de gravité maximal trouvé ou `null` si aucune restriction n'est trouvée.
   */
  findMaxNiveauGravite(restrictions: any[], departementCode: string, zoneType?: string) {
    const restrictionsDepartement = restrictions.find(r => r.departement === departementCode);
    if (!restrictionsDepartement) {
      return null;
    }
    let zonesType = ['SUP', 'SOU', 'AEP'];
    if (zoneType) {
      zonesType = zonesType.filter(z => z === zoneType);
    }
    const niveauxGravite = ['crise', 'alerte_renforcee', 'alerte', 'vigilance'];
    for (const niveauGravite of niveauxGravite) {
      for (const zoneType of zonesType) {
        if (restrictionsDepartement[zoneType][niveauGravite] > 0) {
          return niveauGravite;
        }
      }
    }
    return null;
  }

  /**
   * Formate la mémoire utilisée en Mo (mégaoctets).
   *
   * @param data - Taille de la mémoire en octets.
   * @returns Une chaîne de caractères représentant la taille en Mo (ex: '12.34 MB').
   */
  formatMemoryUsage(data) {
    return `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;
  }

  /**
   * Journalise l'utilisation de la mémoire pour aider au débogage et au suivi des performances.
   */
  logMemoryUsage() {
    const memoryData = process.memoryUsage();

    const memoryUsage = {
      rss: `${this.formatMemoryUsage(memoryData.rss)} -> Resident Set Size - total memory allocated for the process execution`,
      heapTotal: `${this.formatMemoryUsage(memoryData.heapTotal)} -> total size of the allocated heap`,
      heapUsed: `${this.formatMemoryUsage(memoryData.heapUsed)} -> actual memory used during the execution`,
      external: `${this.formatMemoryUsage(memoryData.external)} -> V8 external memory`,
    };

    this.logger.log(memoryUsage);
  }
}