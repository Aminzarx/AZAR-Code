import React, { useState } from 'react'
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, TextInput } from '@shared/components'
import { AuthenticationFailureError, ValidationFailureError } from '@core/auth/errors'
import { canonicalizeIranPhoneNumber } from '@shared/utils/iranPhoneNumber'
import { toEnglishDigits } from '@shared/utils/persianText'

type Props = {
  visible: boolean
  onClose: () => void
  /** the sender's name for the message, when set */
  senderName?: string | null
}

function errorText(error: unknown): string {
  if (error instanceof ValidationFailureError) {
    if (error.code === 'phone_already_registered') return 'این شماره همین حالا ایوان دارد.'
    if (error.code === 'self_referral') return 'شمارهٔ خودتان را نمی‌توانید دعوت کنید.'
    return 'شمارهٔ موبایل درست نیست.'
  }
  if (error instanceof AuthenticationFailureError) {
    return 'برای دعوت، یک بار از حساب خارج و دوباره وارد شوید.'
  }
  return 'به اینترنت وصل نیستید یا سرور پاسخ نداد. دوباره تلاش کنید.'
}

/**
 * v1.4.0 (Amin #4311, «دعوت با پیامک»): type a colleague's mobile → the
 * invite is recorded on the server (who invited whom) → the phone's own
 * SMS app opens with a short note and the personal link. When that
 * colleague signs in with this number, no referral code is asked for.
 */
export function InviteSmsDialog({ visible, onClose, senderName }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { createInvite } = useAuth()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  function close(): void {
    setPhone('')
    setError(null)
    onClose()
  }

  async function handleSend(): Promise<void> {
    const canonical = canonicalizeIranPhoneNumber(toEnglishDigits(phone))
    if (!canonical) {
      setError('شمارهٔ موبایل را مثل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.')
      return
    }
    setError(null)
    setIsSending(true)
    try {
      const invite = await createInvite(canonical)
      const from = senderName ? `${senderName} شما را` : 'شما را'
      const body = `سلام، ${from} به ایوان دعوت کرده؛ دفتر کار همراه مشاوران املاک.\nبرنامه را از این پیوند بگیرید و با همین شماره وارد شوید:\n${invite.url}`
      const local = `0${canonical.slice(3)}`
      await Linking.openURL(`sms:${local}?body=${encodeURIComponent(body)}`)
      close()
    } catch (caughtError) {
      setError(errorText(caughtError))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" accessibilityLabel="بستن">
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={[theme.typography('titleMd'), styles.title]}>دعوت با پیامک</Text>
          <Text style={[theme.typography('bodySm'), styles.lead]}>
            شمارهٔ همکارتان را بنویسید؛ پیامک دعوت با پیوند دریافت برنامه از گوشی خودتان فرستاده می‌شود.
          </Text>
          <TextInput
            label="شمارهٔ موبایل همکار"
            value={phone}
            onChangeText={(text) => {
              setPhone(text)
              setError(null)
            }}
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            keyboardType="phone-pad"
            maxLength={14}
            errorMessage={error ?? undefined}
            autoFocus
          />
          <View style={styles.actions}>
            <Button label="ساخت پیامک دعوت" onPress={handleSend} loading={isSending} disabled={phone.trim().length < 10} />
            <Button label="انصراف" variant="text" onPress={close} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      padding: theme.layout.screenPaddingX,
      backgroundColor: 'rgba(15,23,42,0.45)'
    },
    card: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.extraLarge,
      padding: theme.spacing.space6,
      gap: theme.spacing.space4
    },
    title: { color: theme.colors.onSurface, alignSelf: theme.isRTL ? 'flex-start' : 'flex-end' },
    lead: { color: theme.colors.onSurfaceVariant },
    actions: { gap: theme.spacing.space2 }
  })
}
