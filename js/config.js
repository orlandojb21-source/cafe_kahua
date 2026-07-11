// config.js
// Cambia ENVIRONMENT a "PROD" cuando hagas el deploy final a producción.

const ENVIRONMENT = "DEV"; // "DEV" | "PROD"

const APPS_SCRIPT_URL_DEV  = "https://script.google.com/macros/s/AKfycbxvPgZ_qKHvmY0SQQlk2SCMFFgOH4Ae9c7d59Tt8oXB4bDKCcbhB84AgRxMeGzJ2spsPw/exec";
const APPS_SCRIPT_URL_PROD = "PEGAR_AQUI_URL_APPS_SCRIPT_PROD";

const APPS_SCRIPT_URL = ENVIRONMENT === "PROD"
  ? APPS_SCRIPT_URL_PROD
  : APPS_SCRIPT_URL_DEV;

const APP_CONFIG = {
  nombre: "Kahua",
  moneda: "USD",
  itbmsPct: 7,
  stockBajoUmbral: 20
};
