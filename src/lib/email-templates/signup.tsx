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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to MetaLock — confirm your email to get started</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.brand}>METALOCK</Text>
        </Section>
        <Section style={styles.content}>
          <Heading style={styles.h1}>Welcome to MetaLock</Heading>
          <Text style={styles.text}>
            Thanks for creating your account with{' '}
            <Link href={`mailto:${recipient}`} style={styles.link}>
              {recipient}
            </Link>
            . Confirm your email to activate your account and start trading.
          </Text>
          <Section style={styles.buttonWrap}>
            <Button style={styles.button} href={confirmationUrl}>
              Confirm email
            </Button>
          </Section>
          <Text style={styles.muted}>
            If the button doesn't work, copy and paste this link into your
            browser:
            <br />
            <Link href={confirmationUrl} style={styles.link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Hr style={styles.divider} />
          <Text style={styles.footer}>
            You received this email because someone signed up for MetaLock using
            this address. If it wasn't you, you can safely ignore it.
            <br />
            <br />
            Need help? Contact us at{' '}
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

export default SignupEmail
