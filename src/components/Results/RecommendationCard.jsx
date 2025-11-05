import React from 'react'
import { generateTags } from '../../utils/recommender'

export default function RecommendationCard({course, userPrefs={}}){
  // prefer precomputed tags from recommender utility when present
  const tags = Array.isArray(course._tags) && course._tags.length ? course._tags : generateTags(course, userPrefs)
  const drivers = Array.isArray(course._drivers) ? course._drivers : []

  return (
    <div className="p-3 border rounded shadow-sm flex gap-4 items-start">
      {/* thumbnail: responsive width with fixed height and rounded corners */}
      <img src={course.imageSrc || course.ImageURL || course.thumbnail || '/background.jpg'} alt={course.title || course.name || 'course'} className="w-28 md:w-36 h-20 md:h-24 object-cover rounded" />
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="text-md md:text-lg font-semibold truncate">{course.title}</h3>
            {/* drivers: show small inline badges for top contributors */}
            <div className="flex gap-2 mt-1 flex-wrap">
              {drivers.slice(0,3).map((d, i) => (
                <div key={i} className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700">{d.name}: {Math.round((d.contribution||0)*100)}%</div>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-600 ml-2">{course._score!=null ? (Math.round(course._score*100)) : Math.round((course.analytics?.final_comparison_score||0))}</div>
        </div>
        <p className="text-sm text-gray-700 mt-2 truncate">{course.whatYoullLearn?.[0]||course.analytics?.insight || course.description || ''}</p>
        <div className="mt-2 flex flex-wrap gap-2 max-h-20 overflow-auto">
          {tags && tags.length ? tags.slice(0,20).map((t,idx)=> (
            <TagChip key={idx} tag={t} userPrefs={userPrefs} />
          )) : <div className="text-xs text-gray-500">No tags</div>}
        </div>
      </div>
    </div>
  )
}

function TagChip({tag,userPrefs}){
  const cls = {
    interest: 'bg-green-100 text-green-800',
    topic: 'bg-indigo-100 text-indigo-800',
    badge: 'bg-blue-100 text-blue-800',
    weakness: 'bg-red-100 text-red-800',
    mixed: 'bg-yellow-100 text-yellow-800',
    score: 'bg-gray-100 text-gray-800'
  }[tag.type||'topic']

  const border = tag.match ? 'ring-2 ring-indigo-500' : ''
  const opacity = tag.durationMismatch ? 'opacity-50' : ''

  return (
    <div className={`px-2 py-1 rounded text-xs ${cls} ${border} ${opacity}`} title={`source: ${tag.source || ''}`}>
      {tag.name}
    </div>
  )
}
