import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet } from '../../lib/api'
import { AdminInbox } from './AdminInbox'
import { AdminCallHistory } from './AdminCallHistory'

const CHANNELS = [
  { v: 'whatsapp', icon: 'message-circle', cls: 'wa', label: 'WhatsApp' },
  { v: 'instagram', icon: 'instagram', cls: 'ig', label: 'Instagram' },
  { v: 'web', icon: 'globe', cls: 'web', label: 'Website' },
  { v: 'voice', icon: 'phone-call', cls: 'vc', label: 'Voice' },
]

/**
 * Platform-wide agent activity — stats, business filter, message inbox + call history.
 */
export function AgentActivity() {
  const { t } = useAdminT()
  const [summary, setSummary] = useState(null)
  const [bizId, setBizId] = useState('')
  const [channel, setChannel] = useState('all')
  const [view, setView] = useState('messages') // messages | calls

  const q = bizId ? `?business_id=${bizId}` : ''
  const callsUrl = `/admin/calls${q}`

  useEffect(() => {
    const url = `/admin/activity/summary${bizId ? `?business_id=${bizId}` : ''}`
    apiGet(url).then(setSummary).catch(() => setSummary(null))
    const id = setInterval(() => apiGet(url).then(setSummary).catch(() => {}), 15000)
    return () => clearInterval(id)
  }, [bizId])

  const isVoice = channel === 'voice'
  const msgChannel = isVoice ? undefined : (channel === 'all' ? undefined : channel)

  return (
    <div className="agent-activity">
      {/* stat cards */}
      <div className="act-stats">
        {CHANNELS.map((ch) => {
          const data = summary?.channels?.[ch.v] || {}
          const convs = data.conversations || 0
          const unread = data.unread || 0
          const calls = ch.v === 'voice' ? (data.calls ?? summary?.totals?.calls ?? 0) : null
          return (
            <button
              key={ch.v}
              type="button"
              className={`act-stat ${channel === ch.v ? 'on' : ''}`}
              onClick={() => { setChannel(ch.v); setView(ch.v === 'voice' ? 'calls' : 'messages') }}
            >
              <span className={`act-ic ch-dot ${ch.cls}`}><Icon name={ch.icon} size={18} /></span>
              <div>
                <b>{ch.label}</b>
                <span>
                  {ch.v === 'voice'
                    ? `${calls ?? 0} ${t('act_calls')}`
                    : `${convs} ${t('act_chats')}${unread ? ` · ${unread} ${t('act_unread')}` : ''}`}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* toolbar */}
      <div className="act-toolbar card">
        <div className="act-filters">
          <label>{t('act_business')}</label>
          <select value={bizId} onChange={(e) => setBizId(e.target.value)}>
            <option value="">{t('act_all_biz')}</option>
            {(summary?.businesses || []).map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.convs} / {b.calls})</option>
            ))}
          </select>
        </div>
        <div className="act-tabs">
          <button className={`conn-tab ${view === 'messages' ? 'on' : ''}`} onClick={() => setView('messages')} disabled={isVoice}>
            <Icon name="inbox" size={15} />{t('act_messages')}
          </button>
          <button className={`conn-tab ${view === 'calls' ? 'on' : ''}`} onClick={() => setView('calls')}>
            <Icon name="phone-call" size={15} />{t('act_calls_tab')}
          </button>
        </div>
        {summary?.totals && (
          <div className="act-totals">
            <span>{summary.totals.conversations} {t('act_chats')}</span>
            <span>{summary.totals.calls} {t('act_calls')}</span>
            {summary.totals.unread > 0 && <span className="unread-pill">{summary.totals.unread} {t('act_unread')}</span>}
          </div>
        )}
      </div>

      {/* content */}
      {view === 'calls' || isVoice ? (
        <AdminCallHistory listEndpoint={callsUrl} itemEndpoint="/admin/calls" apiGet={apiGet} showBusiness={!bizId} />
      ) : (
        <div className="act-inbox-wrap">
          <AdminInbox businessId={bizId || undefined} defaultChannel={msgChannel} showBusiness={!bizId} />
        </div>
      )}
    </div>
  )
}

/**
 * Per-channel or per-business history block (used in StsAgents + ConnectionModal).
 */
export function AgentHistoryPanel({ businessId, channel, showBusiness = false, compact = false }) {
  const { t } = useAdminT()
  const [tab, setTab] = useState(channel === 'voice' ? 'calls' : 'messages')
  const q = businessId ? `?business_id=${businessId}` : ''
  const callsUrl = businessId ? `/admin/businesses/${businessId}/calls` : `/admin/calls${q}`

  return (
    <div className="agent-history-panel">
      <div className="act-tabs" style={{ marginBottom: 12 }}>
        {channel !== 'voice' && (
          <button className={`conn-tab ${tab === 'messages' ? 'on' : ''}`} onClick={() => setTab('messages')}>
            <Icon name="message-circle" size={15} />{t('act_messages')}
          </button>
        )}
        <button className={`conn-tab ${tab === 'calls' ? 'on' : ''}`} onClick={() => setTab('calls')}>
          <Icon name="phone-call" size={15} />{t('act_calls_tab')}
        </button>
      </div>
      {tab === 'calls' ? (
        <AdminCallHistory
          listEndpoint={channel === 'voice' && !businessId ? '/admin/voice/calls' : callsUrl}
          itemEndpoint={channel === 'voice' && !businessId ? '/admin/voice/calls' : '/admin/calls'}
          apiGet={apiGet}
          showBusiness={showBusiness}
          compact={compact}
        />
      ) : (
        <AdminInbox
          businessId={businessId}
          defaultChannel={channel === 'website' ? 'web' : channel}
          showBusiness={showBusiness}
          compact={compact}
        />
      )}
    </div>
  )
}
