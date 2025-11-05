import React from 'react'
const OPTIONS = ['Short (1-2 Weeks)','Medium (3-5 Weeks)','Long (6+ Weeks)','On-Demand/Self-Paced']
export default function Step4_Duration({ value = [], onChange, selections, setSelectionProp }){
  function toggle(opt){
    const next = value.includes(opt) ? value.filter(v=>v!==opt) : [...value, opt]
    onChange(next)
  }
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Step 4: Commitment (Duration)</h2>
      <p className="text-gray-600 mb-4">What time commitment are you looking for? (Multi-select)</p>
      <div className="mb-3 flex gap-2 items-center">
        <label className="text-sm">Max course hours:</label>
        <input type="number" min="0" placeholder="e.g. 10" value={selections.maxHours||''} onChange={e=> setSelectionProp('maxHours', e.target.value)} className="border p-2 rounded w-24" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map(opt=> (
          <label key={opt} className={`p-4 border rounded-lg cursor-pointer ${value.includes(opt)? 'border-blue-500 bg-blue-50':''}`}>
            <input type="checkbox" checked={value.includes(opt)} onChange={()=> toggle(opt)} className="mr-2" />
            <span className="font-medium">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
