import type { Tournament } from '@/lib/data/types';
import { FRANCIA_1998 } from '@/lib/data/tournaments/1998';
import { COREAJAPON_2002 } from '@/lib/data/tournaments/2002';
import { ALEMANIA_2006 } from '@/lib/data/tournaments/2006';
import { SUDAFRICA_2010 } from '@/lib/data/tournaments/2010';
import { BRASIL_2014 } from '@/lib/data/tournaments/2014';
import { RUSIA_2018 } from '@/lib/data/tournaments/2018';
import { CATAR_2022 } from '@/lib/data/tournaments/2022';

export const TOURNAMENTS: Tournament[] = [
  FRANCIA_1998,
  COREAJAPON_2002,
  ALEMANIA_2006,
  SUDAFRICA_2010,
  BRASIL_2014,
  RUSIA_2018,
  CATAR_2022,
];

export function getTournament(year: number): Tournament | undefined {
  return TOURNAMENTS.find((t) => t.year === year);
}

export const TOURNAMENT_YEARS = TOURNAMENTS.map((t) => t.year);
