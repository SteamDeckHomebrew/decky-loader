import i18next from 'i18next';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

i18next
  .use(Backend)
  .use(initReactI18next)
  .init({
    debug: true,
    fallbackLng: 'en',
    fallbackNS: 'Common',
    lng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;
