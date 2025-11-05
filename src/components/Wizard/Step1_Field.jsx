import React from 'react'
import SelectionCard from './SelectionCard'

const OPTIONS = ['AI/ML','Data Science','MLOps','Generative AI']
export default function Step1_Field({ value, onChange, selections, setSelectionProp }){
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Step 1: Major Area (Field)</h2>
      <p className="text-gray-600 mb-4">What is the primary domain you are interested in?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map(opt=> (
          <label key={opt} className={`p-4 border rounded-lg cursor-pointer ${value===opt? 'border-blue-500 bg-blue-50':''} text-gray-900 dark:text-gray-100`}>
            <input type="radio" name="field" value={opt} checked={value===opt} onChange={()=> onChange(opt)} className="mr-2" />
            <span className="font-medium text-gray-900 dark:text-gray-100">{opt}</span>
          </label>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="text-md font-semibold mb-2">Desired outcome (optional)</h3>
        <select value={selections.outcome||''} onChange={e=> setSelectionProp('outcome', e.target.value)} className="border p-2 rounded">
          <option value="">Choose an outcome (e.g. Build product, Job-ready, Conceptual)</option>
          <option value="product">Build a product (RAG/LLM app)</option>
          <option value="job">Job-ready skill</option>
          <option value="manager">Manager upskilling</option>
        </select>
      </div>
    </div>
  )
}
