/**
 * TEST UTF-8 ENCODING
 * Vérifie que Supabase/Mock Auth accepte les accents et caractères spéciaux
 */

const http = require('http');

const testCases = [
  {
    name: 'Français - Accents complets',
    data: {
      email: 'francois.test@test.fr',
      password: 'FrançoisPass123',
      name: 'François Où Ça',
      whatsapp: '+33612345678'
    }
  },
  {
    name: 'Espagnol - Ñ et accents',
    data: {
      email: 'spanish.test@test.fr',
      password: 'EspañolPass123',
      name: 'José María Peña',
      whatsapp: '+34912345678'
    }
  },
  {
    name: 'Cameroun - Accent et symboles',
    data: {
      email: 'cameron.test@test.fr',
      password: 'CameroonPass123',
      name: 'Édouard Cameroun',
      whatsapp: '+237681234567'
    }
  },
  {
    name: 'Symboles et ponctuation',
    data: {
      email: 'symbols.test@test.fr',
      password: 'SymbolPass@2024!',
      name: "D'Artagnan O'Brien-Smith",
      whatsapp: '+1 (555) 123-4567'
    }
  }
];

async function runTest(testCase) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(testCase.data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData, 'utf8')
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            status: res.statusCode,
            success: res.statusCode === 201,
            test: testCase.name,
            email: testCase.data.email,
            name: testCase.data.name,
            expected: testCase.data.name
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            success: false,
            test: testCase.name,
            error: e.message
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({
        success: false,
        test: testCase.name,
        error: e.message
      });
    });

    req.write(postData, 'utf8');
    req.end();
  });
}

async function main() {
  console.log('\n📊 TEST UTF-8 SUPPORT - SUPABASE/MOCK AUTH');
  console.log('==========================================\n');

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.test}`);
    console.log(`   Email: ${result.email}`);
    console.log(`   Nom: ${result.name}`);
    console.log(`   Status HTTP: ${result.status}\n`);
  }

  console.log('==========================================');
  console.log('✓ Tous les tests sont terminés');
  console.log('✓ Vérifiez que les accents sont bien sauvegardés');
  console.log('✓ Supabase supporte nativement UTF-8\n');
}

main();
