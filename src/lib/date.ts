const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';

export function getSaoPauloTodayDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Nao foi possivel calcular a data de hoje.');
  }

  return `${year}-${month}-${day}`;
}

export function formatSaoPauloDisplayDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}
