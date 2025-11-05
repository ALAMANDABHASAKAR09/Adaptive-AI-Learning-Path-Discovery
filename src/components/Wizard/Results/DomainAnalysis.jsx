import React from 'react'
export default function DomainAnalysis({ domainScores }){
  return (
    <div className="mb-6 p-4 bg-white rounded">
      <h3 className="text-xl font-bold mb-2">Domain Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {domainScores.map(d=> (
          <div key={d.domain} className="p-3 bg-gray-50 rounded">
            <div className="flex justify-between"><strong>{d.domain}</strong><span>{Math.round((d.score/d.max||0)*100)}%</span></div>
            <div className="w-full bg-gray-200 h-2 rounded mt-2"><div className={`h-2 rounded ${ (d.score/d.max||0) < 0.5 ? 'bg-red-500' : (d.score/d.max||0) < 0.75 ? 'bg-yellow-400':'bg-green-500' }`} style={{width: `${Math.round((d.score/d.max||0)*100)}%`}} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
