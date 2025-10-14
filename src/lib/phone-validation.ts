/**
 * Validation et normalisation des numéros de téléphone
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  countryCode?: string;
  error?: string;
}

/**
 * Valide et normalise un numéro de téléphone
 */
export function validatePhoneNumber(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== "string") {
    return {
      isValid: false,
      normalized: "",
      error: "Numéro de téléphone requis",
    };
  }

  // Nettoyer le numéro (supprimer espaces, tirets, parenthèses)
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Vérifier que c'est un numéro valide
  if (!/^\+?[1-9]\d{1,14}$/.test(cleaned)) {
    return {
      isValid: false,
      normalized: "",
      error: "Format de numéro invalide",
    };
  }

  // Normaliser avec le préfixe +
  const normalized = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;

  // Vérifier la longueur (entre 7 et 15 chiffres après le +)
  const digitsOnly = normalized.replace("+", "");
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return {
      isValid: false,
      normalized: "",
      error: "Numéro trop court ou trop long",
    };
  }

  // Extraire le code pays (premiers chiffres)
  const countryCode = extractCountryCode(normalized);

  return {
    isValid: true,
    normalized,
    countryCode,
  };
}

/**
 * Extrait le code pays d'un numéro normalisé
 */
function extractCountryCode(phone: string): string | undefined {
  const digits = phone.replace("+", "");

  // Codes pays courants
  const countryCodes = [
    { code: "212", country: "MA", length: 9 }, // Maroc
    { code: "33", country: "FR", length: 9 }, // France
    { code: "1", country: "US", length: 10 }, // USA/Canada
    { code: "44", country: "GB", length: 10 }, // UK
    { code: "49", country: "DE", length: 10 }, // Allemagne
    { code: "34", country: "ES", length: 9 }, // Espagne
    { code: "39", country: "IT", length: 9 }, // Italie
  ];

  for (const country of countryCodes) {
    if (digits.startsWith(country.code)) {
      const remainingDigits = digits.substring(country.code.length);
      if (remainingDigits.length === country.length) {
        return country.country;
      }
    }
  }

  return undefined;
}

/**
 * Valide un numéro WhatsApp spécifiquement
 */
export function validateWhatsAppNumber(phone: string): PhoneValidationResult {
  const result = validatePhoneNumber(phone);

  if (!result.isValid) {
    return result;
  }

  // Vérifier que le numéro commence par un code pays valide
  const digits = result.normalized.replace("+", "");

  // Codes pays supportés par WhatsApp
  const supportedCountries = ["212", "33", "1", "44", "49", "34", "39"];
  const isSupported = supportedCountries.some((code) =>
    digits.startsWith(code)
  );

  if (!isSupported) {
    return {
      isValid: false,
      normalized: result.normalized,
      error: "Code pays non supporté par WhatsApp",
    };
  }

  return result;
}
