export function finalSalaryAmount(base: number, bonus: number, deduction: number) {
  if (![base, bonus, deduction].every(Number.isInteger) || base < 0 || bonus < 0 || deduction < 0) throw new Error("Invalid salary amounts");
  const total = base + bonus - deduction;
  if (total < 0) throw new Error("Deduction exceeds earnings");
  return total;
}
export function financeSummary(income: number, expenses: number) { return { income, expenses, net: income - expenses }; }
