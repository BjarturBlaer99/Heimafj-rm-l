// Keep the mobile policy aligned with the web app's lib/password-policy.ts.
export const PASSWORD_REQUIREMENTS =
  'Lykilorðið þarf að vera 10–100 stafir og innihalda lágstaf, hástaf, tölu og tákn.';

export function isStrongPassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{10,100}$/.test(password);
}
