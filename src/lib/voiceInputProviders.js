export const VOICE_PROVIDER_NAMES = Object.freeze({
  WEB_SPEECH: 'webSpeech',
  ANDROID: 'androidSpeech',
  WHISPER: 'whisper',
  MANUAL: 'manual',
})

export const VOICE_ERROR_TYPES = Object.freeze({
  UNSUPPORTED: 'unsupported',
  PERMISSION_DENIED: 'permission_denied',
  MICROPHONE_ERROR: 'microphone_error',
  NO_SPEECH: 'no_speech',
  NETWORK_ERROR: 'network_error',
  ABORTED: 'aborted',
  START_ERROR: 'start_error',
  UNKNOWN: 'unknown',
})

function getWindowRef(windowRef) {
  if (windowRef) {
    return windowRef
  }

  return typeof window !== 'undefined' ? window : null
}

function getNavigatorRef(navigatorRef) {
  if (navigatorRef) {
    return navigatorRef
  }

  return typeof navigator !== 'undefined' ? navigator : null
}

function getRecognitionConstructor(windowRef) {
  return windowRef?.SpeechRecognition || windowRef?.webkitSpeechRecognition || null
}

function createVoiceFailure(type, details = {}) {
  return {
    ok: false,
    type,
    provider: details.provider || VOICE_PROVIDER_NAMES.WEB_SPEECH,
    recognitionError: details.recognitionError || '',
    message: details.message || '',
    permissionState: details.permissionState || '',
    audioInputChecked: Boolean(details.audioInputChecked),
  }
}

function mapRecognitionError(errorName) {
  const cleanName = String(errorName || '').trim()

  if (cleanName === 'not-allowed' || cleanName === 'service-not-allowed') {
    return VOICE_ERROR_TYPES.PERMISSION_DENIED
  }

  if (cleanName === 'audio-capture') {
    return VOICE_ERROR_TYPES.MICROPHONE_ERROR
  }

  if (cleanName === 'no-speech') {
    return VOICE_ERROR_TYPES.NO_SPEECH
  }

  if (cleanName === 'network') {
    return VOICE_ERROR_TYPES.NETWORK_ERROR
  }

  if (cleanName === 'aborted') {
    return VOICE_ERROR_TYPES.ABORTED
  }

  return VOICE_ERROR_TYPES.UNKNOWN
}

function extractRecognitionTranscripts(event) {
  return Array.from(event?.results || [])
    .flatMap((result) => Array.from(result || []))
    .map((alternative) => String(alternative?.transcript || '').trim())
    .filter(Boolean)
}

async function queryMicrophonePermission(navigatorRef) {
  if (!navigatorRef?.permissions?.query) {
    return { supported: false, state: 'unknown' }
  }

  try {
    const status = await navigatorRef.permissions.query({ name: 'microphone' })
    return { supported: true, state: status?.state || 'unknown' }
  } catch {
    return { supported: false, state: 'unknown' }
  }
}

async function checkAudioInputAvailability(navigatorRef) {
  if (!navigatorRef?.mediaDevices?.enumerateDevices) {
    return { checked: false, available: true }
  }

  try {
    const devices = await navigatorRef.mediaDevices.enumerateDevices()
    const audioInputs = devices.filter((device) => device?.kind === 'audioinput')

    if (devices.length > 0 && audioInputs.length === 0) {
      return { checked: true, available: false }
    }

    return { checked: true, available: true }
  } catch {
    return { checked: false, available: true }
  }
}

export class VoiceInputProvider {
  constructor({ windowRef, navigatorRef } = {}) {
    this.windowRef = getWindowRef(windowRef)
    this.navigatorRef = getNavigatorRef(navigatorRef)
  }

  get name() {
    return 'voiceInput'
  }

  async preflight() {
    return { ok: true, provider: this.name }
  }

  async start() {
    return createVoiceFailure(VOICE_ERROR_TYPES.UNSUPPORTED, {
      provider: this.name,
      message: 'Provider does not implement voice input.',
    })
  }

  stop() {}
}

export class WebSpeechProvider extends VoiceInputProvider {
  constructor(options = {}) {
    super(options)
    this.recognition = null
  }

  get name() {
    return VOICE_PROVIDER_NAMES.WEB_SPEECH
  }

  isSupported() {
    return Boolean(getRecognitionConstructor(this.windowRef))
  }

  async preflight() {
    if (!this.windowRef || !this.navigatorRef || !this.isSupported()) {
      return createVoiceFailure(VOICE_ERROR_TYPES.UNSUPPORTED, {
        provider: this.name,
        message: 'Web Speech recognition is not available in this browser.',
      })
    }

    const permission = await queryMicrophonePermission(this.navigatorRef)

    if (permission.state === 'denied') {
      return createVoiceFailure(VOICE_ERROR_TYPES.PERMISSION_DENIED, {
        provider: this.name,
        recognitionError: 'not-allowed',
        permissionState: permission.state,
        message: 'Microphone permission is denied.',
      })
    }

    const audioInput = await checkAudioInputAvailability(this.navigatorRef)

    if (!audioInput.available) {
      return createVoiceFailure(VOICE_ERROR_TYPES.MICROPHONE_ERROR, {
        provider: this.name,
        recognitionError: 'audio-capture',
        permissionState: permission.state,
        audioInputChecked: audioInput.checked,
        message: 'No microphone input was found.',
      })
    }

    return {
      ok: true,
      provider: this.name,
      permissionState: permission.state,
      audioInputChecked: audioInput.checked,
    }
  }

  async start({
    lang = 'en-IN',
    interimResults = false,
    maxAlternatives = 5,
    onReady,
    onStart,
    onResult,
    onError,
    onEnd,
  } = {}) {
    const ready = await this.preflight()

    if (!ready.ok) {
      onError?.(ready)
      return ready
    }

    onReady?.(ready)

    if (this.recognition) {
      this.stop()
    }

    const Recognition = getRecognitionConstructor(this.windowRef)
    const recognition = new Recognition()
    recognition.lang = lang
    recognition.interimResults = interimResults
    recognition.maxAlternatives = maxAlternatives
    recognition.continuous = false

    recognition.onstart = () => {
      onStart?.({ ok: true, provider: this.name })
    }

    recognition.onresult = (event) => {
      onResult?.({
        ok: true,
        provider: this.name,
        transcripts: extractRecognitionTranscripts(event),
      })
    }

    recognition.onerror = (event) => {
      const recognitionError = String(event?.error || '')
      onError?.(createVoiceFailure(mapRecognitionError(recognitionError), {
        provider: this.name,
        recognitionError,
        message: recognitionError,
      }))
    }

    recognition.onend = () => {
      this.recognition = null
      onEnd?.({ ok: true, provider: this.name })
    }

    this.recognition = recognition

    try {
      recognition.start()
    } catch (error) {
      this.recognition = null
      const message = String(error?.message || error || '')
      const recognitionError = error?.name === 'InvalidStateError' ? 'aborted' : 'start-error'
      const failure = createVoiceFailure(
        error?.name === 'InvalidStateError' ? VOICE_ERROR_TYPES.ABORTED : VOICE_ERROR_TYPES.START_ERROR,
        {
          provider: this.name,
          recognitionError,
          message,
        },
      )
      onError?.(failure)
      return failure
    }

    return ready
  }

  stop() {
    if (!this.recognition) {
      return
    }

    try {
      this.recognition.abort()
    } catch {
      // Browser speech implementations may throw after the session has already ended.
    }
  }
}

/**
 * Placeholder contract for future Capacitor/Android native speech.
 *
 * Expected input to start():
 * - lang: BCP-47 language code, for example "en-IN".
 * - onReady/onStart/onResult/onError/onEnd lifecycle callbacks.
 *
 * Expected output:
 * - onResult({ provider: "androidSpeech", transcripts: string[], confidence?: number })
 * - onError({ type, recognitionError, provider: "androidSpeech" })
 *
 * Lifecycle:
 * preflight microphone permission -> start native recognizer -> emit transcript or error -> end.
 * Financial parsing must stay outside this provider.
 */
export class AndroidSpeechProvider extends VoiceInputProvider {
  get name() {
    return VOICE_PROVIDER_NAMES.ANDROID
  }

  async start({ onError } = {}) {
    const failure = createVoiceFailure(VOICE_ERROR_TYPES.UNSUPPORTED, {
      provider: this.name,
      message: 'Android native speech is not connected yet.',
    })
    onError?.(failure)
    return failure
  }
}

export class WhisperProvider extends VoiceInputProvider {
  get name() {
    return VOICE_PROVIDER_NAMES.WHISPER
  }

  async start({ onError } = {}) {
    const failure = createVoiceFailure(VOICE_ERROR_TYPES.UNSUPPORTED, {
      provider: this.name,
      message: 'Whisper transcription is not enabled.',
    })
    onError?.(failure)
    return failure
  }
}

export class ManualProvider extends VoiceInputProvider {
  get name() {
    return VOICE_PROVIDER_NAMES.MANUAL
  }

  async start() {
    return {
      ok: true,
      provider: this.name,
      transcripts: [],
    }
  }
}

export function createVoiceInputProvider({
  providerName = VOICE_PROVIDER_NAMES.WEB_SPEECH,
  windowRef,
  navigatorRef,
} = {}) {
  const options = { windowRef, navigatorRef }

  if (providerName === VOICE_PROVIDER_NAMES.ANDROID) {
    return new AndroidSpeechProvider(options)
  }

  if (providerName === VOICE_PROVIDER_NAMES.WHISPER) {
    return new WhisperProvider(options)
  }

  if (providerName === VOICE_PROVIDER_NAMES.MANUAL) {
    return new ManualProvider(options)
  }

  return new WebSpeechProvider(options)
}
