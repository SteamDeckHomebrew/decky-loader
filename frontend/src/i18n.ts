import i18next from 'i18next';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

i18next
  .use(Backend)
  .use(initReactI18next)
  .init({
    backend:{
      // path where resources get loaded from, or a function
      // returning a path:
      // function(lngs, namespaces) { return customPath; }
      // the returned path will interpolate lng, ns if provided like giving a static path
      // the function might return a promise
      // returning falsy will abort the download
      //
      // If allowMultiLoading is false, lngs and namespaces will have only one element each,
      // If allowMultiLoading is true, lngs and namespaces can have multiple elements
      loadPath: 'http://127.0.0.1:1337/locales/{{lng}}/{{ns}}.json',
    
      // your backend server supports multiloading
      // /locales/resources.json?lng=de+en&ns=ns1+ns2
      // Adapter is needed to enable MultiLoading https://github.com/i18next/i18next-multiload-backend-adapter
      // Returned JSON structure in this case is
      // {
      //  lang : {
      //   namespaceA: {},
      //   namespaceB: {},
      //   ...etc
      //  }
      // }
      allowMultiLoading: false, // set loadPath: '/locales/resources.json?lng={{lng}}&ns={{ns}}' to adapt to multiLoading

      reloadInterval: false // can be used to reload resources in a specific interval (useful in server environments)
    },
    debug: true,
    fallbackLng: 'en',
    fallbackNS: 'Common',
    lng: 'en',
    interpolation: {
      escapeValue: false,
    },
    load: 'languageOnly'
  });

export default i18next;
