import { Utils } from './utils';

describe('Utils', () => {
  describe('getNiveau', () => {
    it('devrait retourner la valeur numérique correcte pour un niveau valide', () => {
      expect(Utils.getNiveau('crise')).toBe(5);
      expect(Utils.getNiveau('alerte_renforcee')).toBe(4);
      expect(Utils.getNiveau('alerte')).toBe(3);
      expect(Utils.getNiveau('vigilance')).toBe(2);
    });

    it('devrait retourner 1 pour un niveau invalide', () => {
      expect(Utils.getNiveau('inconnu')).toBe(1);
      expect(Utils.getNiveau('')).toBe(1);
      expect(Utils.getNiveau(null as unknown as string)).toBe(1);
      expect(Utils.getNiveau(undefined as unknown as string)).toBe(1);
    });
  });

  describe('getNiveauInversed', () => {
    it('devrait retourner le niveau d’alerte pour une valeur numérique valide', () => {
      expect(Utils.getNiveauInversed(5)).toBe('crise');
      expect(Utils.getNiveauInversed(4)).toBe('alerte_renforcee');
      expect(Utils.getNiveauInversed(3)).toBe('alerte');
      expect(Utils.getNiveauInversed(2)).toBe('vigilance');
    });

    it('devrait retourner undefined pour une valeur numérique invalide', () => {
      expect(Utils.getNiveauInversed(1)).toBeUndefined();
      expect(Utils.getNiveauInversed(6)).toBeUndefined();
      expect(Utils.getNiveauInversed(-1)).toBeUndefined();
      expect(Utils.getNiveauInversed(null as unknown as number)).toBeUndefined();
      expect(Utils.getNiveauInversed(undefined as unknown as number)).toBeUndefined();
    });
  });
});