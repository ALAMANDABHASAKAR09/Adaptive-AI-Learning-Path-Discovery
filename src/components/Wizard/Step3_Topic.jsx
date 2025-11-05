import React from 'react'
const OPTIONS = ['LLM Fine-Tuning','RAG','Computer Vision','Time-Series Analysis','Ethical AI','Deep Learning','Data Visualization','Cloud Deployment']
export default function Step3_Topic({ value = [], onChange, selections, setSelectionProp }){
  function toggle(opt){
    const next = value.includes(opt) ? value.filter(v=>v!==opt) : [...value, opt]
    onChange(next)
  }
  function quickAdd(opt){ if(!value.includes(opt)) onChange([...value, opt]) }
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Step 3: Specific Interest (Topic)</h2>
      <p className="text-gray-600 mb-4">Select one or more specific topics you want to focus on. (Multi-select)</p>
      <div className="mb-3 flex gap-2">
        {['RAG','LLM Fine-Tuning','LangChain'].map(t=> (
          <button key={t} onClick={()=> quickAdd(t)} className="px-3 py-1 bg-gray-100 rounded text-sm">Add {t}</button>
        ))}
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
