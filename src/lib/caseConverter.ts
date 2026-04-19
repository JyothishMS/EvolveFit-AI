// Convert camelCase object keys to snake_case
export function toSnakeCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  }

  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      const value = obj[key];
      
      // Don't convert nested objects that should stay as-is (like bodyAnalysis, weeklyPlan)
      if (key === 'bodyAnalysis' || key === 'weeklyPlan') {
        result[snakeKey] = value;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[snakeKey] = toSnakeCase(value);
      } else {
        result[snakeKey] = value;
      }
    }
  }
  return result;
}

// Convert snake_case object keys to camelCase
export function toCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }

  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = obj[key];
      
      if (value && typeof value === 'object' && !Array.isArray(value) && camelKey !== 'bodyAnalysis' && camelKey !== 'weeklyPlan') {
        result[camelKey] = toCamelCase(value);
      } else {
        result[camelKey] = value;
      }
    }
  }
  return result;
}
