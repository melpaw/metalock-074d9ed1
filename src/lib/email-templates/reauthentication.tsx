import * as React from 'react'
import {
  Body,
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

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your MetaLock verification code</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.brand}>METALOCK</Text>
        </Section>
        <Section style={styles.content}>
          <Heading style={styles.h1}>Confirm it's you</Heading>
          <Text style={styles.text}>
            Use the verification code below to confirm your identity on
            MetaLock.
          </Text>
          <Text style={styles.code}>{token}</Text>
          <Text style={styles.muted}>
            This code expires shortly. Never share it with anyone — MetaLock
            will never ask for your code.
          </Text>
          <Hr style={styles.divider} />
          <Text style={styles.footer}>
            If you didn't request this code, you can safely ignore this email.
            If you're worried about account security, contact us at{' '}
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

export default ReauthenticationEmail
