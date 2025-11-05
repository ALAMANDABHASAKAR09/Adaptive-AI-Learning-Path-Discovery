import React from 'react'

export default function Question({ q, value, onChange }){
  const opts = q.options || []
  const domains = q.domains || (q.tag ? [q.tag] : [])

  // Helper for MCMS checkbox toggling
  function handleToggleCheckbox(option){
    const current = Array.isArray(value) ? [...value] : []
    const idx = current.indexOf(option)
    if(idx === -1) current.push(option)
    else current.splice(idx, 1)
    onChange(q.id, current)
  }

  const mcqLike = ['MCQ','MCQ-Matching','MCQ-Reorder','MCQ-Scenario']
  if(mcqLike.includes(q.type)){
    return (
      <div className="p-4 border rounded-lg bg-gray-50 mb-4">
        <p className="font-semibold mb-3">{q.text} <span className="text-xs text-gray-500">({domains.join(', ')})</span></p>
        {opts.map(opt=> (
          <label key={opt} className="flex items-center py-2">
            <input type="radio" name={q.id} checked={value===opt} onChange={e=> onChange(q.id, opt)} className="mr-3" />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if(q.type === 'MCMS'){
    const sel = Array.isArray(value) ? value : []
    return (
      <div className="p-4 border rounded-lg bg-gray-50 mb-4">
        <p className="font-semibold mb-3">{q.text} <span className="text-xs text-gray-500">({domains.join(', ')})</span></p>
        {opts.map(opt=> (
          <label key={opt} className="flex items-center py-2">
            <input type="checkbox" name={q.id} checked={sel.includes(opt)} onChange={()=> handleToggleCheckbox(opt)} className="mr-3" />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  // Written answers (ShortAnswer / LongAnswer)
  return (
    <div className="p-4 border rounded-lg bg-gray-50 mb-4">
      <p className="font-semibold mb-3">{q.text} <span className="text-xs text-gray-500">({domains.join(', ')})</span></p>
      <textarea rows={q.minLength>100?8:4} value={value||''} onChange={e=> onChange(q.id, e.target.value)} className="w-full p-2 border rounded" />
      <p className="text-xs text-yellow-700 mt-2">Hint: {q.helpText || ''} (Min words: {q.minLength||0})</p>
    </div>
  )
}
