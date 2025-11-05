import React from 'react'
export default function ActiveFilters({ filters, onRemove }){
  const tags = []
  if(filters.search) tags.push({key:'search', label:`Search: "${filters.search}"`})
  if(filters.level) tags.push({key:'level', label:`Level: ${filters.level}`})
  filters.topic && Array.from(filters.topic).forEach(t=> tags.push({key:`topic:${t}`, label:`Topic: ${t}`, value:t}))
  filters.duration && Array.from(filters.duration).forEach(t=> tags.push({key:`duration:${t}`, label:`Duration: ${t}`, value:t}))
  if(filters.rating>0) tags.push({key:'rating', label:`Min Rating: ${filters.rating}`})
  if(filters.enrollment>0) tags.push({key:'enrollment', label:`Min Enrollments: ${filters.enrollment}`})
  if(filters.sort && filters.sort!=='ai_score_desc') tags.push({key:'sort', label:`Sorting: ${filters.sort}`})

  if(tags.length===0) return <div className="text-sm text-gray-600 dark:text-gray-300">No active filters</div>

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {tags.map(t=> (
        <div key={t.key} className="cursor-pointer px-3 py-1 rounded-full font-semibold border border-yellow-400 text-yellow-700 bg-transparent" onClick={()=> onRemove && onRemove(t.key, t.value)}>
          {t.label}
        </div>
      ))}
    </div>
  )
}
