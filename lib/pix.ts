function crc16(payload: string) {
  let result = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    result ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) result = (result & 0x8000) ? ((result << 1) ^ 0x1021) & 0xffff : (result << 1) & 0xffff;
  }
  return result.toString(16).toUpperCase().padStart(4, '0');
}

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;
const normalize = (value: string, max: number) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, max);

export function createPixPayload(key: string, receiverName: string, city: string, cents: number, orderNumber: string) {
  const merchantAccount = field('00', 'BR.GOV.BCB.PIX') + field('01', key.trim());
  const additional = field('05', orderNumber.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***');
  const payload = field('00', '01') + field('26', merchantAccount) + field('52', '0000') + field('53', '986') +
    field('54', (cents / 100).toFixed(2)) + field('58', 'BR') + field('59', normalize(receiverName, 25) || 'CHAMA SOFIA') +
    field('60', normalize(city, 15) || 'SAO PAULO') + field('62', additional) + '6304';
  return payload + crc16(payload);
}
