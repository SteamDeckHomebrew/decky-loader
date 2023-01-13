import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from 'i18next-fs-backend';

i18next
    .use(initReactI18next)
    .use(Backend)
    .init({
        backend:
        {
            // path where resources get loaded from, or a function
            // returning a path:
            // function(lngs, namespaces) { return customPath; }
            // the returned path will interpolate lng, ns if provided like giving a static path
            loadPath: '/locales/{{lng}}/{{ns}}.json',
          
            // path to post missing resources
            // addPath: '/locales/{{lng}}/{{ns}}.missing.json',
          
            // if you use i18next-fs-backend as caching layer in combination with i18next-chained-backend, you can optionally set an expiration time
            // an example on how to use it as cache layer can be found here: https://github.com/i18next/i18next-fs-backend/blob/master/example/caching/app.js
            // expirationTime: 60 * 60 * 1000
        },
        fallbackLng:"en",
        fallbackNS:"Common",
        lng: "en",
        interpolation: {
            escapeValue: false,
        },
    });

export default i18next;