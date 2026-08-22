import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPostAuth, apiDelete } from '../../lib/api'
import { useToast } from '../ui'

export function CredentialModal({ business, onClose, onChanged }) {
  const { t } = useAdminT()
  const toast = useToast()
  const [cred, setCred] = useState(null)
  const [show, setShow] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    if (!business) return
    setShow(false); setNewPw(''); setConfirmDel(false); setCred(null)
    apiGet(`/admin/businesses/${business.id}/credential`)
      .then(setCred)
      .catch(() => setCred({ email: business.email, password: null }))
  }, [business])

  if (!business) return null

  const copy = (v) => { navigator.clipboard?.writeText(v || '').catch(() => {}); toast(t('toast_copied')) }

  async function reset() {
    if (newPw.trim().length < 4) { toast(t('toast_pw_short')); return }
    setBusy(true)
    try {
      const r = await apiPostAuth(`/admin/businesses/${business.id}/reset-password`, { password: newPw.trim() })
      setCred({ email: r.email, password: r.password })
      setNewPw(''); setShow(true)
      toast(t('toast_pw_updated'))
      onChanged?.()
    } catch {
      toast(t('toast_update_failed'))
    } finally { setBusy(false) }
  }

  async function del() {
    setBusy(true)
    try {
      await apiDelete(`/admin/businesses/${business.id}`)
      toast(t('toast_account_deleted'))
      onChanged?.()
      onClose()
    } catch {
      toast(t('toast_delete_failed'))
      setBusy(false)
    }
  }

  const pw = cred?.password

  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3 style={{ marginBottom: 4 }}>{business.biz}</h3>
        <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 18 }}>{t('cred_title')}</p>

        <div className="field">
          <label>{t('cred_email')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={cred?.email || business.email || ''} />
            <button type="button" className="btn btn-o" onClick={() => copy(cred?.email || business.email)} title={t('copy')}>
              <Icon name="copy" size={14} />
            </button>
          </div>
        </div>

        <div className="field">
          <label>{t('cred_password')}</label>
          {pw ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly type={show ? 'text' : 'password'} value={pw} />
              <button type="button" className="btn btn-o" onClick={() => setShow((s) => !s)} title={show ? t('hide_password') : t('show_password')}>
                <Icon name={show ? 'eye-off' : 'eye'} size={14} />
              </button>
              <button type="button" className="btn btn-o" onClick={() => copy(pw)} title={t('copy')}>
                <Icon name="copy" size={14} />
              </button>
            </div>
          ) : (
            <div className="hint" style={{ margin: 0 }}>{t('cred_pw_hidden')}</div>
          )}
        </div>

        <div className="field">
          <label>{t('cred_set_pw')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder={t('cred_new_pw')} autoComplete="off" />
            <button type="button" className="btn btn-g" onClick={reset} disabled={busy}>
              <Icon name="key-round" size={14} />{t('update')}
            </button>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '18px 0 14px' }} />

        {!confirmDel ? (
          <button type="button" className="btn btn-r" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setConfirmDel(true)}>
            <Icon name="trash-2" size={15} />{t('cred_delete_account')}
          </button>
        ) : (
          <div>
            <p style={{ fontSize: 12.5, color: '#991B1B', marginBottom: 10 }}>{t('cred_delete_warn')}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-o" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDel(false)} disabled={busy}>
                {t('cancel')}
              </button>
              <button type="button" className="btn btn-r" style={{ flex: 1, justifyContent: 'center' }} onClick={del} disabled={busy}>
                <Icon name="trash-2" size={15} />{t('confirm_delete')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
