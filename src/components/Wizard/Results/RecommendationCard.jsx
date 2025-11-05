import React from 'react'
import CourseCard from '../../Explorer/CourseCard'

export default function RecommendationCard({ course, isTop }){
  return (
    <div className="relative">
      {isTop && <div className="absolute top-2 left-2 z-10"><span className="text-xs font-bold text-white bg-yellow-400 py-1 px-2 rounded">TOP MATCH</span></div>}
      <CourseCard course={course} />
    </div>
  )
}
