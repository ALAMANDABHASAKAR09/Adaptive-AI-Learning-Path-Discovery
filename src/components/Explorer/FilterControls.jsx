import React from 'react'
export default function FilterControls({ onLevelChange }){
  return (
    <div className="flex gap-3 mb-4 items-center">
      <select onChange={e=> onLevelChange && onLevelChange(e.target.value)} className="p-2 border rounded-lg bg-white/90 dark:bg-gray-800/80">
        <option value="">All levels</option>
        <option>Beginner</option>
        <option>Intermediate</option>
        <option>Expert</option>
      </select>
      <div className="p-2 border rounded-lg">Topics</div>
      <div className="p-2 border rounded-lg">Duration</div>
    </div>
  )
}
