/**
 * Script de TEST pour scraper UNE image du portal Glovo
 *
 * TEST SANS RISQUE:
 * - READ ONLY (lecture seule)
 * - Teste avec 1 produit seulement
 * - Aucune modification sur Glovo
 *
 * Usage:
 *   npm install puppeteer
 *   PORTAL_EMAIL=your-email@example.com PORTAL_PASSWORD=your-password node scripts/scrape-glovo-portal-test.js
 */

const puppeteer = require('puppeteer');

// Configuration
const PORTAL_URL = 'https://portal.glovoapp.com';
const STORE_MANAGEMENT_URL = 'https://portal.glovoapp.com/store-management';

// Credentials (depuis variables d'environnement pour sécurité)
const PORTAL_EMAIL = process.env.PORTAL_EMAIL;
const PORTAL_PASSWORD = process.env.PORTAL_PASSWORD;

// Produit de test
const TEST_SKU = '0d65ab45-529d-4707-97a8-8d959b6d509b';

async function scrapeSingleProduct() {
  console.log('🤖 Scraper Glovo Portal - TEST MODE');
  console.log('=====================================');
  console.log('⚠️  TEST READ ONLY - Aucune modification');
  console.log('📦 Produit à tester:', TEST_SKU);
  console.log('');

  if (!PORTAL_EMAIL || !PORTAL_PASSWORD) {
    console.error('❌ Erreur: Variables d\'environnement manquantes');
    console.error('💡 Usage: PORTAL_EMAIL=xxx PORTAL_PASSWORD=xxx node script.js');
    process.exit(1);
  }

  let browser;
  let page;

  try {
    // Lancer le navigateur
    console.log('🌐 Lancement du navigateur...');
    browser = await puppeteer.launch({
      headless: false, // Mode visible pour debugging
      slowMo: 100, // Ralentir pour voir ce qui se passe
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // 1. Aller sur le portal
    console.log('📍 Navigation vers', PORTAL_URL);
    await page.goto(PORTAL_URL, { waitUntil: 'networkidle2' });

    // Attendre un peu pour voir la page
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Se connecter (Tu devras adapter selon le formulaire de login)
    console.log('🔐 Connexion en cours...');
    console.log('   Email:', PORTAL_EMAIL);

    // Attendre le formulaire de login
    try {
      // Essayer de trouver les champs de login
      // Les sélecteurs peuvent varier, on essaye plusieurs options

      // Option 1: Par type
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');

      if (emailInput && passwordInput) {
        await emailInput.type(PORTAL_EMAIL);
        await passwordInput.type(PORTAL_PASSWORD);

        // Chercher le bouton de login
        const loginButton = await page.$('button[type="submit"]');
        if (loginButton) {
          await loginButton.click();
          console.log('✅ Login submitted');
        }
      } else {
        console.log('⚠️  Formulaire de login non trouvé automatiquement');
        console.log('💡 Connecte-toi manuellement dans le navigateur qui s\'est ouvert');
        console.log('⏸️  Appuie sur ENTER une fois connecté...');

        // Attendre input utilisateur
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve());
        });
      }
    } catch (error) {
      console.log('⚠️  Erreur login auto, connexion manuelle requise');
      console.log('💡 Connecte-toi manuellement, puis appuie sur ENTER...');
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
    }

    // 3. Aller sur Store Management
    console.log('📦 Navigation vers Store Management...');
    await page.goto(STORE_MANAGEMENT_URL, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. Chercher le produit
    console.log('🔍 Recherche du produit:', TEST_SKU);

    // Trouver la barre de recherche
    const searchInput = await page.$('input[placeholder="Search for Products"]');

    if (!searchInput) {
      throw new Error('❌ Barre de recherche non trouvée');
    }

    // Taper le SKU
    await searchInput.click();
    await searchInput.type(TEST_SKU, { delay: 100 });
    console.log('⌨️  SKU tapé dans la recherche');

    // Attendre que les résultats se chargent
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Trouver l'image du produit
    console.log('🖼️  Recherche de l\'image...');

    const productImage = await page.$('img[data-test-id="ProductCard--product-image"]');

    if (!productImage) {
      console.log('⚠️  Image non trouvée avec data-test-id');
      console.log('💡 Essai avec sélecteur générique...');

      // Essayer de trouver toutes les images
      const allImages = await page.$$('img');
      console.log(`📸 ${allImages.length} images trouvées sur la page`);

      // Afficher les URLs des images
      for (const img of allImages) {
        const src = await img.evaluate(el => el.src);
        if (src.includes('deliveryhero.io')) {
          console.log('   →', src);
        }
      }
    } else {
      // Extraire l'URL de l'image
      const imageUrl = await productImage.evaluate(img => img.src);

      console.log('');
      console.log('✅ IMAGE TROUVÉE!');
      console.log('================');
      console.log('SKU:', TEST_SKU);
      console.log('Image URL:', imageUrl);
      console.log('');

      // Extraire l'UUID de l'image
      const match = imageUrl.match(/([a-f0-9-]{36})\.jpeg/);
      if (match) {
        const imageUuid = match[1];
        console.log('📦 Image UUID:', imageUuid);
        console.log('');
        console.log('✅ TEST RÉUSSI! Le scraping fonctionne!');
      }
    }

    // Pause pour que tu puisses voir le résultat
    console.log('');
    console.log('⏸️  Navigateur reste ouvert pour inspection');
    console.log('💡 Appuie sur ENTER pour fermer...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🚪 Navigateur fermé');
    }
  }
}

// Lancer le test
scrapeSingleProduct().then(() => {
  console.log('✅ Script terminé');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
