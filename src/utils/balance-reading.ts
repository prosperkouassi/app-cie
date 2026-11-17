import { balanceParams, parseKWh, type SetupParams } from './setup-params';

export type ReadingInput = { balance: string; date: string; time: string };
const pad = (n: number) => String(n).padStart(2, '0');

export function readingClock(now = new Date()) {
  return { date: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`, time: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
}

// Parse local wall-clock time explicitly; Date.parse is ambiguous for French dates.
export function readingParams(input: ReadingInput): SetupParams {
  const kWh = parseKWh(input.balance);
  if (kWh === null) throw new Error('Saisissez un solde positif ou nul en kWh, par exemple 12,5 ou 0.');
  const date = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.date.trim());
  const time = /^(\d{2}):(\d{2})$/.exec(input.time.trim());
  if (!date || !time) throw new Error('Indiquez la date au format JJ/MM/AAAA et l’heure au format HH:mm.');
  const [, day, month, year] = date.map(Number);
  const [, hours, minutes] = time.map(Number);
  const reading = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (reading.getFullYear() !== year || reading.getMonth() !== month - 1 || reading.getDate() !== day || reading.getHours() !== hours || reading.getMinutes() !== minutes) {
    throw new Error('Vérifiez la date et l’heure du relevé.');
  }
  return balanceParams({ kWh, validatedAt: reading.toISOString() });
}
