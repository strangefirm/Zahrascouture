require('dotenv').config();

const baseCost = parseFloat(process.env.SHIPPING_BASE_COST || 50);
const extraPer100g = parseFloat(process.env.SHIPPING_EXTRA_PER_100G || 10);

/**
 * Calculates shipping cost based on total order weight.
 * @param {number} totalWeightGrams Total weight of items in grams
 * @returns {number} Shipping cost in INR
 */
function calculateShipping(totalWeightGrams) {
  if (!totalWeightGrams || totalWeightGrams <= 0) return 0;
  
  if (totalWeightGrams <= 500) {
    return baseCost;
  }
  
  const extraWeight = totalWeightGrams - 500;
  const extraUnits = Math.ceil(extraWeight / 100);
  return baseCost + (extraUnits * extraPer100g);
}

module.exports = {
  calculateShipping
};
