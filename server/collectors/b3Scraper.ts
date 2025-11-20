import { JSDOM } from 'jsdom';
import { formatDateForB3 } from '../utils/businessDays';

const B3_BASE_URL = 'https://www2.bmf.com.br/pages/portal/bmfbovespa/boletim1/SistemaPregao1.asp';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

export interface B3DailyRates {
  [contractCode: string]: number;
}

export const fetchB3DailyRates = async (date: Date): Promise<B3DailyRates | null> => {
  const dateStr = formatDateForB3(date);
  const cacheBuster = `&_t=${new Date().getTime()}`;
  const encodedUrl = encodeURIComponent(
    `${B3_BASE_URL}?pagetype=pop&caminho=Resumo%20Estat%EDstico%20-%20Sistema%20Preg%E3o&Data=${dateStr}&Mercadoria=DI1`
  );
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${CORS_PROXY}${encodedUrl}${cacheBuster}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`B3 fetch failed for ${dateStr}: HTTP ${response.status}`);
      return null;
    }
    
    const htmlText = await response.text();
    const dom = new JSDOM(htmlText);
    const doc = dom.window.document;
    
    const rates: B3DailyRates = {};
    const rows = Array.from(doc.querySelectorAll('tr'));

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 3) continue;

      const cellTexts = cells.map(c => c.textContent?.trim() || '');
      
      let ticker = '';
      let rate = 0;
      let found = false;

      for (let i = 0; i < cellTexts.length; i++) {
        const text = cellTexts[i];
        if (/^(DI1)?F\d{2}$/.test(text)) {
          ticker = text.startsWith('DI1') ? text : `DI1${text}`;
          for (let j = 1; j <= 4; j++) {
            const potentialRate = cellTexts[i + j];
            if (potentialRate && /^\d{1,3},\d{1,4}$/.test(potentialRate)) {
              rate = parseFloat(potentialRate.replace(',', '.'));
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }

      if (found && ticker && rate > 0) {
        rates[ticker] = rate;
      }
    }
    
    return Object.keys(rates).length > 0 ? rates : null;

  } catch (error) {
    console.error(`Error fetching B3 data for ${dateStr}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
};

export const probeB3Connection = async (): Promise<boolean> => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = await fetchB3DailyRates(yesterday);
    return result !== null && Object.keys(result).length > 0;
  } catch {
    return false;
  }
};
