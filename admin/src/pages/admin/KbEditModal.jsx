import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useAdminT } from '../../i18n/admin'
import { apiPut } from '../../lib/api'
import { useToast } from '../ui'

/**
 * Edit a stored knowledge entry — opens pre-filled with its saved data so it
 * can be corrected. `putBase` is the update path base ('/admin/knowledge' or
 * '/admin/voice/knowledge'); `channels` are the scope options for this context.
 */
export function KbEditModal({ entry, putBase, channels, onClose, onSaved }) {
  const { isAr } = useAdminT()
  const toast = useToast()
  const [f, setF] = useState({
    title: entry.title || '', content: entry.content || '',
    source_url: entry.source_url || '', channel: entry.channel || channels[0].v,
  })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const isUrl = entry.type === 'url'

  async function save() {
    try { await apiPut(`${putBase}/${entry.id}`, f); toast(isAr ? 'تم الحفظ ✓' : 'Saved ✓'); onSaved?.(); onClose() }
    catch { toast(isAr ? 'فشل الحفظ' : 'Save failed') }
  }

  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 520 }}>
        <button className="modal-x" onClick={onClose}><Icon name="x" /></button>
        <h3 style={{ marginBottom: 12 }}><Icon name="pencil" size={16} /> {isAr ? 'تعديل المعرفة' : 'Edit knowledge'}</h3>
        <div className="field"><label>{isUrl ? 'URL' : (isAr ? 'السؤال' : 'Question')}</label>
          <input value={f.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        {isUrl ? (
          <div className="field"><label>URL</label><input value={f.source_url} onChange={(e) => set('source_url', e.target.value)} /></div>
        ) : (
          <div className="field"><label>{isAr ? 'الجواب' : 'Answer'}</label><textarea rows="5" value={f.content} onChange={(e) => set('content', e.target.value)} /></div>
        )}
        <div className="field"><label>{isAr ? 'تدريب لِـ' : 'Train for'}</label>
          <select value={f.channel} onChange={(e) => set('channel', e.target.value)}>
            {channels.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
          </select>
        </div>
        <button className="btn btn-g" style={{ width: '100%', justifyContent: 'center' }} onClick={save}>
          <Icon name="save" size={16} />{isAr ? 'حفظ التعديلات' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
