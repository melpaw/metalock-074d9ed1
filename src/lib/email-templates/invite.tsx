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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to MetaLock</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.brand}>METALOCK</Text>
        </Section>
        <Section style={styles.content}>
          <Heading style={styles.h1}>You've been invited</Heading>
          <Text style={styles.text}>
            You've been invited to join <strong>MetaLock</strong>. Accept the
            invitation below to create your account and get started.
          </Text>
          <Section style={styles.buttonWrap}>
            <Button style={styles.button} href={confirmationUrl}>
              Accept invitation
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
            If you weren't expecting this invitation, you can safely ignore this
            email.
            <br />
            <br />
            Questions?{' '}
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

export default InviteEmail
