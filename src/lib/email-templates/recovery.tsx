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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your MetaLock password</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.brand}>METALOCK</Text>
        </Section>
        <Section style={styles.content}>
          <Heading style={styles.h1}>Reset your password</Heading>
          <Text style={styles.text}>
            We received a request to reset the password for your MetaLock
            account. Click the button below to choose a new one.
          </Text>
          <Section style={styles.buttonWrap}>
            <Button style={styles.button} href={confirmationUrl}>
              Reset password
            </Button>
          </Section>
          <Text style={styles.muted}>
            This link expires shortly for your security. If the button doesn't
            work, paste this URL into your browser:
            <br />
            <Link href={confirmationUrl} style={styles.link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Hr style={styles.divider} />
          <Text style={styles.footer}>
            If you didn't request a password reset, you can safely ignore this
            email — your password will not be changed.
            <br />
            <br />
            Need help? Contact{' '}
            <Link href={`mailto:${BRAND.supportEmail}`} style={styles.footerLink}>
              {BRAND.supportEmail}
            </Link>
            .
            <br />
            <br />© {new Date().getFullYear()} MetaLock. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
