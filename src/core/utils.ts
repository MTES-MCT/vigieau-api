const NIVEAUX_INT = {
  crise: 5,
  alerte_renforcee: 4,
  alerte: 3,
  vigilance: 2
};

export class Utils {
  static getNiveau(niveauAlerte) {
    return niveauAlerte in NIVEAUX_INT ? NIVEAUX_INT[niveauAlerte] : 1
  }

  static getNiveauInversed(niveauAlerte) {
    return Object.keys(NIVEAUX_INT).find(key => NIVEAUX_INT[key] === niveauAlerte)
  }
}