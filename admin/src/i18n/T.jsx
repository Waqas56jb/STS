import { useAdminT } from './admin'

export function T({ k, html = false, as: Tag = 'span', className, ...rest }) {
  const { t } = useAdminT()
  const value = t(k)
  if (html) {
    return <Tag className={className} dangerouslySetInnerHTML={{ __html: value }} {...rest} />
  }
  return (
    <Tag className={className} {...rest}>
      {value}
    </Tag>
  )
}
