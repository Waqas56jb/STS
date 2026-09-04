import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { API } from '../lib/api'

const token = () => localStorage.getItem('sts_token')

/** Admin copy of accent picker — same API, admin preview route by default. */
export function VoiceAccentPicker({
  value = 'alloy',
  onChange,
  previewPath = '/admin/tts/preview',
  voicesPath = '/tts/voices',
  labels = {},
}) {
  const [voices, setVoices] = useState([])
  const [playing, setPlaying] = useState(null)
  const [error, setError] = useState('')
  const audioRef = useRef(null)
  const urlRef = useRef(null)

  useEffect(() => {
    fetch(API + voicesPath, { headers: { Authorization: 'Bearer ' + (token() || '') } })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setVoices(Array.isArray(rows) ? rows : []))
      .catch(() => setVoices([]))
    return () => { stop() }
  }, [voicesPath])

  function stop() {
    try { audioRef.current?.pause() } catch { /* ignore */ }
    audioRef.current = null
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null }
    setPlaying(null)
  }

  async function preview(id, e) {
    e?.stopPropagation?.()
    setError('')
    if (playing === id) { stop(); return }
    stop()
    setPlaying(id)
    try {
      const res = await fetch(API + previewPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + (token() || ''),
        },
        body: JSON.stringify({ voice: id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Preview failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setPlaying(null)
      audio.onerror = () => { setPlaying(null); setError(labels.fail || 'Could not play preview') }
      await audio.play()
    } catch (err) {
      setPlaying(null)
      setError(err.message || labels.fail || 'Preview failed')
    }
  }

  const selected = value || 'alloy'

  return (
    <div className="voice-accent">
      <div className="voice-accent-head">
        <label>{labels.title || 'AI voice / accent'}</label>
        <span className="hint">{labels.hint || 'Preview each voice, then select. WhatsApp voice notes use this accent.'}</span>
      </div>
      {error && <div className="voice-accent-err">{error}</div>}
      <div className="voice-accent-grid">
        {voices.map((v) => {
          const on = selected === v.id
          const busy = playing === v.id
          return (
            <button
              key={v.id}
              type="button"
              className={`voice-accent-card${on ? ' on' : ''}`}
              onClick={() => onChange?.(v.id)}
            >
              <div className="voice-accent-top">
                <b>{v.label}</b>
                <span className="voice-accent-tag">{v.accent}</span>
              </div>
              <div className="voice-accent-meta">{v.gender} · {v.style}</div>
              <div className="voice-accent-actions">
                <span className={`voice-accent-pick${on ? ' yes' : ''}`}>
                  {on ? (labels.selected || 'Selected') : (labels.select || 'Select')}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  className={`btn btn-o voice-accent-preview${busy ? ' busy' : ''}`}
                  onClick={(e) => preview(v.id, e)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') preview(v.id, e) }}
                  title={labels.preview || 'Preview'}
                >
                  <Icon name={busy ? 'pause' : 'play'} size={14} />
                  {busy ? (labels.playing || 'Playing…') : (labels.preview || 'Preview')}
                </span>
              </div>
            </button>
          )
        })}
      </div>
      {!voices.length && (
        <div className="hint" style={{ padding: '12px 0' }}>{labels.loading || 'Loading voices…'}</div>
      )}
    </div>
  )
}
