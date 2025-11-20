export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const isBusinessDay = (date: Date): boolean => {
  return !isWeekend(date);
};

export const formatDateForB3 = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDateISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getLastNBusinessDays = (n: number): Date[] => {
  const days: Date[] = [];
  let current = new Date();
  
  current.setDate(current.getDate() - 1);

  while (days.length < n) {
    if (isBusinessDay(current)) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() - 1);
  }
  return days.reverse();
};

export const getNextBusinessDay = (date: Date = new Date()): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  
  while (!isBusinessDay(next)) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
};
