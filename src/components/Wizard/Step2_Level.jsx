import React from 'react'
const OPTIONS = ['Basic/Foundational','Intermediate/Practical','Advanced/Expert']
export default function Step2_Level({ value, onChange, selections, setSelectionProp }){
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Step 2: Stated Experience (Level)</h2>
      <p className="text-gray-600 mb-4">How experienced are you in this field?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map(opt=> (
          <label key={opt} className={`p-4 border rounded-lg cursor-pointer ${value===opt? 'border-blue-500 bg-blue-50':''}`}>
            <input type="radio" name="level" value={opt} checked={value===opt} onChange={()=> onChange(opt)} className="mr-2" />
            <span className="font-medium">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
