import React from 'react'
export default function CourseCard({ course, compact = false, showImage = true }){
  const rating = course.ratingValue || course.Rating || ''
  const enroll = course.analytics?.enrollments || course.enrollments || '-'
  const hours = course.totalHours || course.duration || ''
  const myScore = course.analytics?.myScore || course.myScore || ''

  return (
    <a href={course.link||'#'} target="_blank" rel="noreferrer" className={`course-card bg-white dark:bg-gray-800 group block rounded overflow-hidden ${compact? 'p-2':' '}`}>
      {showImage && (
        <div className={`course-card__image-container ${compact? 'h-20':'h-40'}`}>
          <img src={course.ImageURL||course.imageSrc||''} alt={course.title||'Course image'} className={`course-card__image object-cover w-full h-full ${compact? 'opacity-90':' '}`} />
        </div>
      )}

      <div className={`${compact? 'p-2 text-sm':'p-4'} text-gray-900 dark:text-gray-100`}>
        <div className="flex justify-between items-start mb-1">
          <h3 className={`font-bold ${compact? 'text-sm':'text-lg'}`}>{course.title}</h3>
          <div className="text-xs text-gray-500 dark:text-gray-300">{rating}</div>
        </div>

        {/* description hidden until hover on normal cards; compact cards show less text */}
        <p className={`${compact? 'text-xs text-gray-600 dark:text-gray-300 line-clamp-3':'text-sm text-gray-600 dark:text-gray-300 hidden group-hover:block'}`}>
          {(course.description||course.analytics?.insight||'').slice(0, compact? 140 : 200)}{compact? '':'...'}
        </p>

        {/* metadata: show always for compact, otherwise reveal on hover */}
        <div className={`${compact? 'flex justify-between items-center mt-2 text-xs text-gray-700 dark:text-gray-200':'hidden group-hover:flex justify-between mt-3 text-xs text-gray-600 dark:text-gray-300'}`}>
          <span>{course.level || ''}</span>
          <span>{hours ? (hours + ' hrs') : ''}</span>
          <span>Enrolls: <strong className="text-gray-800 dark:text-gray-100">{enroll}</strong></span>
          {myScore ? <span>My score: <strong>{myScore}</strong></span> : null}
        </div>

        {/* hover-only insights overlay for non-compact */}
        {!compact && (
          <div className="mt-2 hidden group-hover:block text-xs text-gray-500">
            <div>{course.analytics?.insight?.reason || ''}</div>
          </div>
        )}
      </div>
    </a>
  )
}
