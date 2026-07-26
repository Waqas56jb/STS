import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiGet, apiPostAuth, apiDelete } from '../../lib/api'
import { useToast } from '../ui'

/**
 * Customer account credentials — admin-only.
 *
 * Shows the login email + password (revealed from the reversibly-encrypted
 * copy), lets the admin set a new password, and permanently delete the
 * account. All customer accounts are created by the admin, so this is the
 * single place where those credentials are managed.
 *   GET    /api/admin/businesses/:id/credential
 *   POST   /api/admin/businesses/:id/reset-password
 *   DELETE /api/admin/businesses/:id
 */
export function CredentialModal({ business, onClose, onChanged }) {
  const { isAr } = useAdminT()
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

  const copy = (v) => { navigator.clipboard?.writeText(v || '').catch(() => {}); toast(isAr ? 'تم النسخ ✓' : 'Copied ✓') }

  async function reset() {
    if (newPw.trim().length < 4) { toast(isAr ? 'كلمة مرور قصيرة جداً' : 'Password too short'); return }
    setBusy(true)
    try {
      const r = await apiPostAuth(`/admin/businesses/${business.id}/reset-password`, { password: newPw.trim() })
      setCred({ email: r.email, password: r.password })
      setNewPw(''); setShow(true)
      toast(isAr ? 'تم تحديث كلمة المرور ✓' : 'Password updated ✓')
      onChanged?.()
    } catch {
      toast(isAr ? 'فشل التحديث' : 'Update failed')
    } finally { setBusy(false) }
  }

  async function del() {
    setBusy(true)
    try {
      await apiDelete(`/admin/businesses/${business.id}`)
      toast(isAr ? 'تم حذف الحساب' : 'Account deleted')
      onChanged?.()
      onClose()
    } catch {
      toast(isAr ? 'فشل الحذف' : 'Delete failed')
      setBusy(false)
    }
  }

  const pw = cred?.password

  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3 style={{ marginBottom: 4 }}>{business.biz}</h3>
        <p style={{ color: 'var(--mut)', fontSize: 13, marginBottom: 18 }}>
          {isAr ? 'بيانات دخول العميل' : 'Customer login credentials'}
        </p>

        {/* email */}
        <div className="field">
          <label>{isAr ? 'البريد الإلكتروني' : 'Login email'}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={cred?.email || business.email || ''} />
            <button type="button" className="btn btn-o" onClick={() => copy(cred?.email || business.email)} title={isAr ? 'نسخ' : 'Copy'}>
              <Icon name="copy" size={14} />
            </button>
          </div>
        </div>

        {/* password */}
        <div className="field">
          <label>{isAr ? 'كلمة المرور' : 'Password'}</label>
          {pw ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly type={show ? 'text' : 'password'} value={pw} />
              <button type="button" className="btn btn-o" onClick={() => setShow((s) => !s)} title={show ? 'Hide' : 'Show'}>
                <Icon name={show ? 'eye-off' : 'eye'} size={14} />
              </button>
              <button type="button" className="btn btn-o" onClick={() => copy(pw)} title={isAr ? 'نسخ' : 'Copy'}>
                <Icon name="copy" size={14} />
              </button>
            </div>
          ) : (
            <div className="hint" style={{ margin: 0 }}>
              {isAr ? 'كلمة المرور غير متاحة للعرض — اضبط كلمة مرور جديدة بالأسفل.' : 'Password not viewable for this account — set a new one below.'}
            </div>
          )}
        </div>

        {/* reset */}
        <div className="field">
          <label>{isAr ? 'تعيين كلمة مرور جديدة' : 'Set a new password'}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder={isAr ? 'كلمة مرور جديدة' : 'New password'} autoComplete="off" />
            <button type="button" className="btn btn-g" onClick={reset} disabled={busy}>
              <Icon name="key-round" size={14} />{isAr ? 'تحديث' : 'Update'}
            </button>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '18px 0 14px' }} />

        {/* delete */}
        {!confirmDel ? (
          <button type="button" className="btn btn-r" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setConfirmDel(true)}>
            <Icon name="trash-2" size={15} />{isAr ? 'حذف الحساب نهائياً' : 'Delete this account'}
          </button>
        ) : (
          <div>
            <p style={{ fontSize: 12.5, color: '#991B1B', marginBottom: 10 }}>
              {isAr
                ? 'سيتم حذف الحساب وكل بياناته (المحادثات، الفواتير…) نهائياً. لا يمكن التراجع.'
                : 'This permanently deletes the account and all its data (conversations, invoices…). This cannot be undone.'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-o" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDel(false)} disabled={busy}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-r" style={{ flex: 1, justifyContent: 'center' }} onClick={del} disabled={busy}>
                <Icon name="trash-2" size={15} />{isAr ? 'تأكيد الحذف' : 'Confirm delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
