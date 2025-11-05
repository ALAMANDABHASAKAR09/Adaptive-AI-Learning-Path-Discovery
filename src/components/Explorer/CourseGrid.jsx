import React from 'react'
import CourseCard from './CourseCard'
export default function CourseGrid({ courses, compact = false }){
  return (
    <div className={`grid gap-6 ${compact? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6':'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
      {courses.map((c,i)=> <CourseCard key={i} course={c} compact={compact} showImage={!compact} />)}
    </div>
  )
}
