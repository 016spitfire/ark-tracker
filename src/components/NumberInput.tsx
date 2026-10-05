import { useEffect, useState } from 'react'

type Props = {
  value: number
  onChange: (value: number) => void
  className?: string
}

// A non-negative decimal input. Keeps the raw text while typing so "1." doesn't snap back
// to "1", and only reports valid numbers. Picks up outside changes (like Apply) to `value`.
export default function NumberInput({ value, onChange, className }: Props) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    setText(current => (Number(current) === value ? current : String(value)))
  }, [value])

  return (
    <input
      className={className}
      inputMode="decimal"
      value={text}
      onChange={e => {
        setText(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= 0) onChange(n)
      }}
    />
  )
}
