// Mappage des niveaux d'alerte à leurs valeurs numériques
const NIVEAUX_INT: Record<string, number> = {
  crise: 5,
  alerte_renforcee: 4,
  alerte: 3,
  vigilance: 2
};

export class Utils {
  /**
   * Retourne la valeur numérique correspondant à un niveau d'alerte donné.
   *
   * @param niveauAlerte - Le niveau d'alerte sous forme de chaîne (ex: 'crise', 'alerte').
   * @returns La valeur numérique associée au niveau d'alerte. Retourne `1` si le niveau n'est pas reconnu.
   */
  static getNiveau(niveauAlerte: string): number {
    return NIVEAUX_INT[niveauAlerte] ?? 1;
  }

  /**
   * Retourne le niveau d'alerte correspondant à une valeur numérique donnée.
   *
   * @param niveauAlerte - La valeur numérique du niveau d'alerte (ex: 5, 4, 3, ...).
   * @returns Le niveau d'alerte sous forme de chaîne (ex: 'crise', 'alerte') ou `undefined` si la valeur n'est pas trouvée.
   */
  static getNiveauInversed(niveauAlerte) {
    return Object.keys(NIVEAUX_INT).find(key => NIVEAUX_INT[key] === niveauAlerte)
  }
}