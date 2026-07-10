// Shared MetaLock email styles — Binance-inspired dark card on white body.
// Body must stay #ffffff per email client compatibility rules; the inner
// container is dark to match the app's Binance-style look.

export const BRAND = {
  name: 'MetaLock',
  supportEmail: 'support@mymetalock.com',
  url: 'https://mymetalock.com',
  // Binance-style mustard primary
  primary: '#F0B90B',
  primaryText: '#0B0E11',
  // Surfaces
  bodyBg: '#ffffff',
  cardBg: '#0B0E11',
  cardBorder: '#2B3139',
  surfaceElevated: '#181A20',
  // Text
  text: '#EAECEF',
  muted: '#848E9C',
  code: '#F0B90B',
}

const font =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export const styles = {
  main: {
    backgroundColor: BRAND.bodyBg,
    fontFamily: font,
    margin: 0,
    padding: '32px 0',
  } as const,
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    backgroundColor: BRAND.cardBg,
    borderRadius: '8px',
    border: `1px solid ${BRAND.cardBorder}`,
    overflow: 'hidden' as const,
  },
  header: {
    padding: '28px 32px 0',
    textAlign: 'left' as const,
  },
  brand: {
    color: BRAND.primary,
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    margin: 0,
    fontFamily: font,
  },
  content: {
    padding: '24px 32px 32px',
  },
  h1: {
    color: BRAND.text,
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: '32px',
    margin: '0 0 16px',
    fontFamily: font,
  },
  text: {
    color: BRAND.text,
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0 0 16px',
    fontFamily: font,
  },
  muted: {
    color: BRAND.muted,
    fontSize: '13px',
    lineHeight: '20px',
    margin: '16px 0 0',
    fontFamily: font,
  },
  link: {
    color: BRAND.primary,
    textDecoration: 'underline' as const,
  },
  button: {
    backgroundColor: BRAND.primary,
    color: BRAND.primaryText,
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '6px',
    padding: '14px 28px',
    textDecoration: 'none' as const,
    display: 'inline-block' as const,
    fontFamily: font,
  },
  buttonWrap: {
    padding: '8px 0 8px',
  },
  code: {
    display: 'inline-block' as const,
    backgroundColor: BRAND.surfaceElevated,
    color: BRAND.code,
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '8px',
    padding: '16px 24px',
    borderRadius: '6px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    margin: '8px 0 16px',
  },
  divider: {
    borderColor: BRAND.cardBorder,
    borderStyle: 'solid' as const,
    borderWidth: '1px 0 0 0',
    margin: '24px 0',
  },
  footer: {
    color: BRAND.muted,
    fontSize: '12px',
    lineHeight: '18px',
    margin: '0',
    fontFamily: font,
  },
  footerLink: {
    color: BRAND.muted,
    textDecoration: 'underline' as const,
  },
}
