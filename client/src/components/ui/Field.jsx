import { useId } from 'react'
import { cn } from '../../lib/cn'

const controlStyles =
  'w-full rounded-xl border border-line-2 bg-white px-3.5 py-3 text-[14.5px] text-ink ' +
  'placeholder:text-muted-2 transition-colors duration-200 ' +
  'focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/12'

/**
 * Labelled form control.
 *
 * Generates its own id so the label is always correctly associated, and
 * wires aria-describedby to the error message when one is shown.
 */
export function Field({
  label,
  type = 'text',
  as = 'input',
  options,
  error,
  className,
  required,
  ...props
}) {
  const id = useId()
  const errorId = `${id}-error`

  const shared = {
    id,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    className: cn(
      controlStyles,
      error && 'border-red-500 focus:border-red-500 focus:ring-red-500/12',
    ),
    ...props,
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </label>

      {as === 'textarea' && (
        <textarea rows={4} {...shared} className={cn(shared.className, 'resize-y')} />
      )}

      {as === 'select' && (
        <select {...shared}>
          {options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {as === 'input' && <input type={type} {...shared} />}

      {error && (
        <p id={errorId} className="text-[12.5px] text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
