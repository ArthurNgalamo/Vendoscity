/**
 * Scratch script to verify our new imports and middlewares can be loaded successfully by Node.js.
 */
try {
  console.log('Testing priceCalculator...');
  const { calculateFinalPrice, calculateCommission } = require('C:/Users/Administrator/Downloads/Vendoscity-main/Vendoscity-main/server/middleware/priceCalculator');
  
  const testPrice = calculateFinalPrice(10, 'USD', 'electronique');
  console.log('calculateFinalPrice(10 USD, electronique):', testPrice);
  if (testPrice.price_final !== 7500) {
    throw new Error(`Expected price_final to be 7500, got ${testPrice.price_final}`);
  }
  
  const testComm = calculateCommission(52000, 'bronze');
  console.log('calculateCommission(52000 FCFA, bronze):', testComm);
  if (testComm.commission !== Math.round(52000 / 6)) {
    throw new Error(`Expected commission to be ${Math.round(52000 / 6)}, got ${testComm.commission}`);
  }

  console.log('Testing translator...');
  const { getSourceLanguage } = require('C:/Users/Administrator/Downloads/Vendoscity-main/Vendoscity-main/server/middleware/translator');
  console.log('getSourceLanguage(1688):', getSourceLanguage('1688'));

  console.log('Testing importRoutes...');
  const importRoutes = require('C:/Users/Administrator/Downloads/Vendoscity-main/Vendoscity-main/server/routes/importRoutes');
  console.log('importRoutes loaded successfully.');

  console.log('✅ ALL BACKEND FILES LOADED AND TESTED SUCCESSFULLY!');
} catch (err) {
  console.error('❌ FAILURE:', err);
  process.exit(1);
}
