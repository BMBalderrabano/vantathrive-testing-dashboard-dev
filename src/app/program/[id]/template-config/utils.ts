export function parseValueWithUnit(value: string | null): {
  value: string;
  unit: string;
} {
  if (!value) return { value: '', unit: '' };
  const distanceUnits = ['m', 'km', 'mi', 'ft', 'yd'];
  const weightUnits = ['kg', 'lb', 'oz'];

  for (const unit of [...distanceUnits, ...weightUnits]) {
    if (value.endsWith(unit)) {
      return { value: value.slice(0, -unit.length).trim(), unit };
    }
  }
  return { value, unit: '' };
}

export function formatValueWithUnit(
  value: string | null,
  unit: string,
): string | null {
  if (!value && !unit) return null;
  if (!value) return null;
  return unit ? `${value}${unit}` : value;
}
