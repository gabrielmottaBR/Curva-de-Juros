import { Maturity, HistoricalData, Opportunity } from '../types';
import { AVAILABLE_MATURITIES } from '../constants';
import { calculateMean, calculateStdDev, calculateZScore } from '../utils/math';

// --- CONSTANTS & HELPERS ---

const B3_BASE_URL = 'https://www2.bmf.com.br/pages/portal/bmfbovespa/boletim1/SistemaPregao1.asp';
// Using allorigins as it handles text responses well for B3's old encoding
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const formatDateForB3 = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const getLastNBusinessDays = (n: number): Date[] => {
  const days: Date[] = [];
  let current = new Date();
  
  // Start from yesterday to ensure data availability (B3 publishes EOD)
  current.setDate(current.getDate() - 1); 

  while (days.length < n) {
    if (!isWeekend(current)) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() - 1);
  }
  return days.reverse(); // Chronological order
};

// --- B3 FETCHING LOGIC ---

const fetchB3DailyRates = async (date: Date): Promise<Record<string, number> | null> => {
  const dateStr = formatDateForB3(date);
  // Add cache buster to prevent proxy from serving stale errors
  const cacheBuster = `&_t=${new Date().getTime()}`;
  const encodedUrl = encodeURIComponent(`${B3_BASE_URL}?pagetype=pop&caminho=Resumo%20Estat%EDstico%20-%20Sistema%20Preg%E3o&Data=${dateStr}&Mercadoria=DI1`);
  
  try {
    // Timeout promise to prevent hanging
    const controller = new AbortController();
    // Reduced timeout for faster fallback to simulated data
    const timeoutId = setTimeout(() => controller.abort(), 3000); 

    const response = await fetch(`${CORS_PROXY}${encodedUrl}${cacheBuster}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    const rates: Record<string, number> = {};
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
            // Regex to find generic DI1 ticker (DI1 + Letter + Year) or just (Letter + Year)
            // Matches F25, DI1F25, etc.
            if (/^(DI1)?F\d{2}$/.test(text)) {
                ticker = text.startsWith('DI1') ? text : `DI1${text}`;
                for (let j = 1; j <= 4; j++) {
                    const potentialRate = cellTexts[i + j];
                    // Optimized Regex: Matches 11,25 or 11,250 (flexible decimal places)
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
    // Silent fail for individual days
    return null;
  }
};

/**
 * Generates realistic simulated data if B3 connection fails.
 * Uses a random walk with drift to create plausible yield curves.
 */
const generateFallbackData = (days: number): Map<string, HistoricalData[]> => {
  const map = new Map<string, HistoricalData[]>();
  // Re-generate days to ensure we have a valid x-axis even in simulation
  const dates = getLastNBusinessDays(days);
  
  AVAILABLE_MATURITIES.forEach((m, index) => {
    // Base curve: 10.80% + term premium
    const startRate = 10.80 + (index * 0.65); 
    const volatility = 0.08; // Daily volatility
    const drift = 0.002; // Slight upward drift logic
    
    const series: HistoricalData[] = [];
    let currentRate = startRate;

    // Generate from T-100 to T-0
    for (let i = 0; i < days; i++) {
       // Random Walk
       const change = (Math.random() - 0.5) * volatility + (Math.random() > 0.5 ? drift : -drift);
       currentRate += change;
       
       // Ensure we don't go negative or absurd
       if (currentRate < 9) currentRate = 9;
       if (currentRate > 16) currentRate = 16;

       series.push({
         date: '', // Filled below
         shortRate: 0,
         longRate: parseFloat(currentRate.toFixed(3)),
         spread: 0
       });
    }
    
    // Assign dates chronologically (Oldest -> Newest for internal logic consistency before final reverse)
    // The generator builds T-100...T-0.
    
    const finalSeries = series.map((item, idx) => ({
      ...item,
      date: dates[idx] ? dates[idx].toISOString().split('T')[0] : `Day ${idx}`
    }));

    map.set(m.id, finalSeries);
  });
  
  return map;
};

/**
 * Sparse Fetching Strategy with FAIL-FAST Probe
 */
const buildMarketHistory = async (
    onProgress: (percent: number, message: string) => void
): Promise<{ map: Map<string, HistoricalData[]>, success: boolean }> => {
    
    const totalDaysNeeded = 100;
    const allBusinessDays = getLastNBusinessDays(totalDaysNeeded);
    
    // 1. FAIL FAST PROBE: Check the most recent business day first.
    // If this fails, we assume the proxy or B3 is inaccessible and fallback immediately.
    // This avoids waiting 60s+ for timeouts.
    const probeIndex = allBusinessDays.length - 1; // Index of most recent day
    const probeDate = allBusinessDays[probeIndex];
    
    onProgress(10, "Testando conectividade com B3...");
    const probeResult = await fetchB3DailyRates(probeDate);
    
    if (!probeResult) {
        console.warn("Probe failed. Aborting B3 fetch.");
        return { map: new Map(), success: false };
    }

    // 2. If Probe succeeds, proceed with Sparse Fetching
    // Checkpoints: Every 5th day
    const stepSize = 5;
    const checkpoints: { date: Date; index: number }[] = [];
    
    // Add the probe result to data first
    const checkpointData: Map<number, Record<string, number>> = new Map();
    checkpointData.set(probeIndex, probeResult);

    // Build rest of checkpoints
    for (let i = 0; i < allBusinessDays.length - 1; i += stepSize) {
        checkpoints.push({ date: allBusinessDays[i], index: i });
    }
    
    let completed = 0;
    const totalCheckpoints = checkpoints.length;

    // We can execute these; since probe passed, we have high confidence.
    for (const cp of checkpoints) {
        const rates = await fetchB3DailyRates(cp.date);
        if (rates) {
            checkpointData.set(cp.index, rates);
        }
        completed++;
        // Progress from 10% to 80%
        const percent = 10 + Math.round((completed / totalCheckpoints) * 70);
        onProgress(percent, `Coletando: ${formatDateForB3(cp.date)}`);
    }

    // 3. Interpolation Phase
    onProgress(85, "Interpolando curvas de juros...");

    const historyMap = new Map<string, HistoricalData[]>();

    AVAILABLE_MATURITIES.forEach(maturity => {
        const ticker = maturity.id;
        const series: HistoricalData[] = [];
        
        let lastKnownRate: number | null = null;

        // Iterate chronologically
        for (let i = 0; i < allBusinessDays.length; i++) {
            const dateStr = allBusinessDays[i].toISOString().split('T')[0];
            let rate = 0;

            if (checkpointData.has(i) && checkpointData.get(i)![ticker]) {
                rate = checkpointData.get(i)![ticker];
                lastKnownRate = rate;
            } else if (lastKnownRate !== null) {
                rate = lastKnownRate; // Forward fill
            } else {
                // Look ahead if start is missing
                let foundFuture = 0;
                for(let j=i+1; j < allBusinessDays.length; j++) {
                    if(checkpointData.has(j) && checkpointData.get(j)![ticker]) {
                        foundFuture = checkpointData.get(j)![ticker];
                        break;
                    }
                }
                rate = foundFuture || 11.50; // Fallback default
                lastKnownRate = rate;
            }

            series.push({
                date: dateStr,
                shortRate: 0,
                longRate: rate,
                spread: 0
            });
        }
        historyMap.set(ticker, series);
    });

    return { map: historyMap, success: true };
};


// --- MAIN EXPORT ---

export interface ScanResult {
  opportunities: Opportunity[];
  mode: 'LIVE' | 'SIMULATED';
}

export const scanOpportunities = async (
    onProgress?: (percent: number, status: string) => void
): Promise<ScanResult> => {
  
  const updateProgress = onProgress || ((p, s) => console.log(`[${p}%] ${s}`));

  updateProgress(5, "Inicializando...");

  try {
    // Try to build real history
    const { map: marketHistoryMap, success } = await buildMarketHistory(updateProgress);
    
    let finalMap = marketHistoryMap;
    let mode: 'LIVE' | 'SIMULATED' = 'LIVE';

    if (!success) {
        console.warn("Switching to Simulation Mode due to fetch failure.");
        updateProgress(90, "Gerando dados simulados...");
        try {
          finalMap = generateFallbackData(100);
          console.log("Fallback data generated successfully, map size:", finalMap.size);
        } catch (err) {
          console.error("Error generating fallback data:", err);
          throw err;
        }
        mode = 'SIMULATED';
        // Small UX delay to let user read the status
        await new Promise(r => setTimeout(r, 800));
        console.log("Continuing after simulation delay...");
    } else {
        updateProgress(90, "Calculando estatísticas...");
    }

    const opportunities: Opportunity[] = [];
    const maturities = AVAILABLE_MATURITIES;

    console.log("Starting opportunity calculation, maturities:", maturities.length);

    for (let i = 0; i < maturities.length; i++) {
        for (let j = i + 1; j < maturities.length; j++) {
        const short = maturities[i];
        const long = maturities[j];
        console.log(`Processing pair: ${short.id} - ${long.id}`);

        const shortSeries = finalMap.get(short.id);
        const longSeries = finalMap.get(long.id);

        if (!shortSeries || !longSeries || shortSeries.length === 0) continue;

        const combinedHistory: HistoricalData[] = [];
        const minLen = Math.min(shortSeries.length, longSeries.length);
        
        for (let k = 0; k < minLen; k++) {
            const sRate = shortSeries[k].longRate; 
            const lRate = longSeries[k].longRate;
            
            combinedHistory.push({
                date: shortSeries[k].date,
                shortRate: sRate,
                longRate: lRate,
                spread: parseFloat((lRate - sRate).toFixed(2))
            });
        }
        
        // Reverse for display (Oldest -> Newest) if needed
        // Our `getLastNBusinessDays` returns Chronological (Oldest first)
        // So `shortSeries` is Oldest -> Newest.
        // Charts expect Oldest -> Newest.
        // So we DO NOT reverse here if we want Left=Old, Right=New.
        // Let's verifying generateFallbackData: pushes Oldest->Newest.
        // Verifying getLastNBusinessDays: pushes Newest->Oldest then Reverses. So Oldest->Newest.
        // Correct. No reverse needed.

        const spreads = combinedHistory.map(d => d.spread);
        const mean = calculateMean(spreads);
        const stdDev = calculateStdDev(spreads, mean);
        const currentSpread = spreads[spreads.length - 1]; 
        const zScore = calculateZScore(currentSpread, mean, stdDev);

        let recommendation: 'BUY SPREAD' | 'SELL SPREAD' | 'NEUTRAL' = 'NEUTRAL';
        if (zScore < -1.5) recommendation = 'BUY SPREAD';
        if (zScore > 1.5) recommendation = 'SELL SPREAD';

        opportunities.push({
            id: `${short.id}-${long.id}`,
            shortId: short.id,
            longId: long.id,
            shortLabel: short.label.split(' ')[2].replace('(', '').replace(')', ''),
            longLabel: long.label.split(' ')[2].replace('(', '').replace(')', ''),
            zScore,
            currentSpread,
            recommendation,
            historicalData: combinedHistory
        });
        }
    }

    console.log("Opportunities calculated:", opportunities.length);
    updateProgress(100, "Concluído.");
    console.log("Returning scan result with mode:", mode);
    return {
        opportunities: opportunities.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)),
        mode
    };

  } catch (e) {
      console.error("Critical Scanner Error", e);
      // Ultimate failsafe
      const fallbackMap = generateFallbackData(100);
      // Reuse logic or just return empty safe state with one mock opportunity to avoid crash
      return { opportunities: [], mode: 'SIMULATED' };
  }
};