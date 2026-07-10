import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { BRAND, styles } from './_shared'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your MetaLock sign-in link</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.brand}>METALOCK</Text>
        </Section>
        <Section style={styles.content}>
          <Heading style={styles.h1}>Sign in to MetaLock</Heading>
          <Text style={styles.text}>
            Click the button below to securely sign in to your account. This
            link will expire shortly.
          </Text>
          <Section style={styles.buttonWrap}>
            <Button style={styles.button} href={confirmationUrl}>
              Sign in
            </Button>
          </Section>
          <Text style={styles.muted}>
            If the button doesn't work, paste this URL into your browser:
            <br />
            <Link href={confirmationUrl} style={styles.link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Hr style={styles.divider} />
          <Text style={styles.footer}>
            If you didn't request this link, you can safely ignore this email.
            <br />
            <br />
            Need help?{' '}
            <Link href={`mailto:${BRAND.supportEmail}`} style={styles.footerLink}>
              {BRAND.supportEmail}
            </Link>
            <br />
            <br />© {new Date().getFullYear()} MetaLock. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
