import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Icon, TextInput } from '@shared/components'
import { useAuth } from '@features/auth/AuthProvider'
import { AUTH_API_BASE_URL } from '@infrastructure/auth/config'
import { DivarImportError, SyncApiClient, type DivarPost } from '@infrastructure/sync/syncApiClient'
import { toPersianDigits } from '@shared/utils/persianText'
import { divarLinkIn } from '../services/divarImport'
import { useDivarImportSwitch } from '../services/divarSwitch'

type Props = {
  /** a link shared from Divar into EYVAN: read at once */
  sharedLink?: string
  onImported: (post: DivarPost) => Promise<void>
}

const client = new SyncApiClient(AUTH_API_BASE_URL)

/**
 * Navid 2026-10-27 «ورود آگهی از دیوار»: on the first step of a new file, a Divar post's link (pasted, or shared from
 * Divar's own «اشتراک‌گذاری») fills the file; the broker checks it and saves. Only that one post is read.
 */
export function DivarImportBox({ sharedLink, onImported }: Props): React.JSX.Element | null {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  // Amin #5795: shown only once the user turned it on in «تنظیمات ← اتصال‌ها و API‌ها»
  const { on } = useDivarImportSwitch()
  const [link, setLink] = useState(sharedLink ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const started = useRef(false)

  async function read(text: string): Promise<void> {
    const found = divarLinkIn(text)
    if (!found) {
      setError('لینک یک آگهی دیوار را بچسبانید (مثل divar.ir/v/…).')
      return
    }
    if (!session || busy) return
    setBusy(true)
    setError(null)
    try {
      const { post, charged } = await client.divarImport(session.sessionToken, found)
      await onImported(post)
      setDone(
        charged > 0
          ? `اطلاعات آگهی وارد شد (${toPersianDigits(String(charged))} توکن). همه را بررسی و بعد ذخیره کنید.`
          : 'اطلاعات آگهی وارد شد. همه را بررسی و بعد ذخیره کنید.'
      )
    } catch (caught) {
      setError(
        caught instanceof DivarImportError && caught.message
          ? caught.message
          : 'خواندن آگهی انجام نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.'
      )
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (sharedLink && on === true && !started.current) {
      started.current = true
      read(sharedLink).catch(() => undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedLink, session, on])

  if (on !== true) return null

  if (done) {
    return (
      <View style={[styles.box, styles.doneBox]}>
        <Icon name="check" size="sm" color={theme.colors.onSuccessContainer} />
        <Text style={[theme.typography('bodySm'), styles.doneText]}>{done}</Text>
      </View>
    )
  }
  return (
    <View style={styles.box}>
      <TextInput
        label="ورود از دیوار (اختیاری)"
        value={link}
        onChangeText={(value) => {
          setLink(value)
          setError(null)
        }}
        placeholder="لینک آگهی دیوار را اینجا بچسبانید"
        errorMessage={error ?? undefined}
        helperText="یا در دیوار روی «اشتراک‌گذاری» بزنید و ایوان را انتخاب کنید."
      />
      <Button label="خواندن آگهی" variant="secondary" onPress={() => read(link)} loading={busy} disabled={!link.trim()} />
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    box: {
      gap: theme.spacing.space2,
      padding: theme.spacing.space4,
      marginBottom: theme.spacing.space4,
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.surfaceContainerLow
    },
    doneBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.successContainer
    },
    doneText: {
      color: theme.colors.onSuccessContainer,
      flex: 1
    }
  })
}
