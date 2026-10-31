import React, { useEffect, useRef, useState } from 'react'
import { Clipboard, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { Button, FormScreenContainer, Icon, QrCodeScanner, TextInput } from '@shared/components'
import { useAuth } from '@features/auth/AuthProvider'
import { getDatabase } from '@infrastructure/database/connection'
import { generateId } from '@infrastructure/auth/idGenerators'
import { bumpFilesVersion } from '@infrastructure/sync/filesVersion'
import { SHARED_FILE_LABEL, shareCodeOf, type SharedFile } from '../shareFile'
import { receiveShare, shareErrorText } from '../services/shareClient'
import { saveSharedFile } from '../services/saveSharedFile'

type Props = NativeStackScreenProps<MainStackParamList, 'ReceiveFile'>

const NOT_A_SHARE = 'این بارکد یا لینک، لینک اشتراک فایل ایوان نیست. از فرستنده بخواهید در فایل «اشتراک‌گذاری» را بزند.'
const SAVE_FAILED = 'فایل دریافت شد ولی روی گوشی ذخیره نشد. «ذخیرهٔ دوباره» را بزنید.'

/**
 * Amin #6339/#6341/#6523: «تنظیمات ← دریافت فایل» — the camera reads the sender's barcode (or the link is pasted, or it
 * arrives by opening «eyvan://share?c=…»), the server hands the file over once, and it is saved as a new file of this
 * phone marked «فایل اشتراکی», which then opens. A file already taken from the server but not saved yet stays in memory
 * here, so «ذخیرهٔ دوباره» never needs the (now used) link again.
 */
export function ReceiveFileScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const [link, setLink] = useState('')
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [unsaved, setUnsaved] = useState<SharedFile | null>(null)
  const started = useRef(false)

  async function save(file: SharedFile): Promise<void> {
    if (!session) return
    try {
      const id = await saveSharedFile(await getDatabase(), session.userId, file, generateId)
      setUnsaved(null)
      bumpFilesVersion()
      navigation.replace('PropertyDetail', { propertyId: id })
    } catch {
      setUnsaved(file)
      setProblem(SAVE_FAILED)
    }
  }

  async function receive(raw: string): Promise<void> {
    if (!session || busy) return
    const code = shareCodeOf(raw)
    if (!code) {
      setProblem(NOT_A_SHARE)
      return
    }
    setBusy(true)
    setProblem(null)
    try {
      const { file } = await receiveShare(session.sessionToken, code)
      await save(file)
    } catch (e) {
      setProblem(shareErrorText(e))
    } finally {
      setBusy(false)
    }
  }

  // opened from a link: take it at once
  const fromLink = route.params?.code
  useEffect(() => {
    if (!fromLink || !session || started.current) return
    started.current = true
    void receive(fromLink)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLink, session])

  return (
    <FormScreenContainer headerTitle="دریافت فایل" onBack={() => navigation.goBack()}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Icon name="download" size="sm" color={theme.colors.primary} />
          </View>
          <View style={styles.text}>
            <Text style={[theme.typography('titleSm'), styles.title]}>فایل از همکار</Text>
            <Text style={[theme.typography('bodySm'), styles.note]}>
              {`بارکدی را که همکارتان در ایوان ساخته اسکن کنید. فایل با برچسب «${SHARED_FILE_LABEL}» به فایل‌های شما اضافه می‌شود.`}
            </Text>
          </View>
        </View>
      </View>

      {unsaved ? (
        <>
          <Text style={[theme.typography('bodyMd'), styles.error]}>{problem ?? SAVE_FAILED}</Text>
          <Button label="ذخیرهٔ دوباره" loading={busy} onPress={() => void save(unsaved)} />
        </>
      ) : (
        <>
          <Button label="اسکن بارکد فایل" loading={busy} disabled={!session} onPress={() => setScanning(true)} />
          <Text style={[theme.typography('labelMd'), styles.or]}>یا</Text>
          <TextInput
            label="لینک فایل"
            placeholder="eyvan://share?c=…"
            value={link}
            onChangeText={(v) => {
              setLink(v)
              setProblem(null)
            }}
            helperText="لینکی که با پیامک یا پیام‌رسان رسیده را این‌جا بگذارید."
          />
          <View style={styles.actions}>
            <Button
              label="چسباندن"
              variant="secondary"
              style={styles.action}
              onPress={() => {
                Clipboard.getString()
                  .then((v) => {
                    setLink(v.trim())
                    setProblem(null)
                  })
                  .catch(() => undefined)
              }}
            />
            <Button
              label="دریافت فایل"
              style={styles.action}
              loading={busy}
              disabled={!session || !link.trim()}
              onPress={() => void receive(link)}
            />
          </View>
          {problem ? <Text style={[theme.typography('bodySm'), styles.error]}>{problem}</Text> : null}
          <Text style={[theme.typography('bodySm'), styles.note]}>
            هر لینک یک ساعت اعتبار دارد و فقط یک‌بار باز می‌شود؛ پس از دریافت، برای فرستنده هم دیگر کار نمی‌کند.
          </Text>
        </>
      )}

      <QrCodeScanner
        visible={scanning}
        title="اسکن بارکد فایل"
        onScan={(value) => {
          setScanning(false)
          void receive(value)
        }}
        onClose={() => setScanning(false)}
      />
    </FormScreenContainer>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.extraLarge,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: theme.spacing.space4,
      marginBottom: theme.spacing.space4
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space3 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.secondaryContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    text: { flex: 1, gap: theme.spacing.space1 },
    title: { color: theme.colors.onSurface, alignSelf: start },
    note: { color: theme.colors.onSurfaceVariant, alignSelf: start, marginTop: theme.spacing.space2 },
    or: { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginVertical: theme.spacing.space3 }, // rtl-allow: the «یا» divider between scan and paste
    error: { color: theme.colors.error, alignSelf: start, marginTop: theme.spacing.space2 },
    actions: { flexDirection: 'row', gap: theme.spacing.space3, marginTop: theme.spacing.space3 },
    action: { flex: 1 }
  })
}
