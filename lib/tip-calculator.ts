export function calculateTipDistribution(amount: number) {
  const authorPercentage = 0.91 // 91%
  const zoraPercentage = 0.004 // 0.4%
  const liquidityPercentage = 0.01 // 1%
  const asterionPercentage = 0.096 // 9.6%

  return {
    authorAmount: amount * authorPercentage,
    zoraAmount: amount * zoraPercentage,
    liquidityAmount: amount * liquidityPercentage,
    asterionAmount: amount * asterionPercentage,
  }
}
