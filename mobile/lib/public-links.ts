import { Linking } from 'react-native';

export const publicLinks = {
  privacy: 'https://minfjarmal.vercel.app/privacy',
  help: 'https://minfjarmal.vercel.app/help',
  support: 'mailto:bjarturbbg@gmail.com?subject=M%C3%ADn%20fj%C3%A1rm%C3%A1l%20%E2%80%94%20a%C3%B0sto%C3%B0',
};
export async function openPublicLink(key: keyof typeof publicLinks) {
  try { await Linking.openURL(publicLinks[key]); }
  catch { throw new Error(key === 'support' ? 'Ekki tókst að opna póstforrit. Þú getur sent okkur póst á bjarturbbg@gmail.com.' : 'Ekki tókst að opna tengilinn. Reyndu aftur.'); }
}
