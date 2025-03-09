import Cookies from 'js-cookie';

const CONSENT_COOKIE_NAME = 'cookie-consent';
const CONSENT_COOKIE_DURATION = 365; // days

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export type ConsentPreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

export const getConsentPreferences = (): ConsentPreferences | null => {
  const consent = Cookies.get(CONSENT_COOKIE_NAME);
  return consent ? JSON.parse(consent) : null;
};

export const setConsentPreferences = (preferences: ConsentPreferences) => {
  Cookies.set(CONSENT_COOKIE_NAME, JSON.stringify(preferences), {
    expires: CONSENT_COOKIE_DURATION,
    sameSite: 'strict',
    secure: true
  });
};

export const hasConsent = () => {
  return !!Cookies.get(CONSENT_COOKIE_NAME);
};