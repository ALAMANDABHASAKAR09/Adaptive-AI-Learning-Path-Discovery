import React, { useEffect, useMemo, useState } from 'react'
import Header from './Header'
import ActiveFilters from './ActiveFilters'
import CourseGrid from './CourseGrid'

export default function Explorer({ initialCourses = [], compactView = false }){
  const [courses, setCourses] = useState(initialCourses)
  const [activeFilters, setActiveFilters] = useState({
    level: '', topic: new Set(), duration: new Set(), rating: 0, enrollment: 0, search: '', sort: 'ai_score_desc'
  })
  const [page, setPage] = useState(1)
  const pageSize = 3

  // new state for collapsible filter sections
  const [expanded, setExpanded] = useState({}) // explicit toggles (persist while true)
  const [hoverSection, setHoverSection] = useState(null) // temporary on-hover

  useEffect(()=> setCourses(initialCourses), [initialCourses])

  // Helper: derive tags when analytics.filter_tags missing
  function deriveTagsFromCourse(c){
    const tags = new Set()
    const text = ((c.title||'') + ' ' + (c.whatYoullLearn||[]).join(' ') + ' ' + (c.description||'')).toLowerCase()
    const hours = parseFloat(c.totalHours) || 0
    if(hours < 5) tags.add('Short (< 5h)')
    else if(hours < 10) tags.add('Short (5-10h)')
    else if(hours <= 25) tags.add('Medium (10-25h)')
    else tags.add('Long (> 25h)')
    if(text.includes('generative')) tags.add('Generative AI')
    if(text.includes('langchain')) tags.add('Langchain')
    if(text.includes('copilot') || text.includes('studio')) tags.add('Copilot/Studio')
    if(text.includes('llm') || text.includes('prompt')) tags.add('LLM/Prompt')
    if(text.includes('api') || text.includes('python') || text.includes('javascript')) tags.add('Development')
    if(text.includes('ethic') || text.includes('impact')) tags.add('Ethics/Impact')
    if(text.includes('vector') || text.includes('embedding') || text.includes('rag')) tags.add('RAG/Vector')
    if(c.level) tags.add(c.level)
    return Array.from(tags)
  }

  // derive unique tags from courses
  const uniqueTags = useMemo(()=>{
    const levels = new Set()
    const topics = new Set()
    const durations = new Set()
    courses.forEach(c=>{
      if(c.level && typeof c.level === 'string' && !c.level.toLowerCase().includes('courses')) levels.add(c.level)
      const tags = (c.analytics && Array.isArray(c.analytics.filter_tags) && c.analytics.filter_tags.length) ? c.analytics.filter_tags : deriveTagsFromCourse(c)
      tags.forEach(t=>{
        if(t.includes('(')) durations.add(t)
        else if(!['Beginner','Intermediate','Expert'].includes(t)) topics.add(t)
      })
    })
    // ensure standard level order and include any extra levels after
    const standard = ['Beginner','Intermediate','Expert']
    const extra = Array.from(levels).filter(l=> !standard.includes(l)).sort()
    return { level: [...standard.filter(s=> levels.has(s)), ...extra], topic: Array.from(topics).sort(), duration: Array.from(durations).sort() }
  }, [courses])

  useEffect(()=> setPage(1), [activeFilters.level, Array.from(activeFilters.topic).join(','), Array.from(activeFilters.duration).join(','), activeFilters.search, activeFilters.rating, activeFilters.enrollment, activeFilters.sort])

  function toggleSet(key, value){
    setActiveFilters(f=>{
      const next = { ...f }
      const s = new Set(f[key])
      if(s.has(value)) s.delete(value); else s.add(value)
      next[key] = s
      return next
    })
  }

  function setLevel(v){ setActiveFilters(f=> ({ ...f, level: v })) }
  function setSort(v){ setActiveFilters(f=> ({ ...f, sort: v })) }
  function setRating(v){ setActiveFilters(f=> ({ ...f, rating: Number(v) })) }
  function setEnrollment(v){ setActiveFilters(f=> ({ ...f, enrollment: Number(v) })) }
  function setSearch(v){ setActiveFilters(f=> ({ ...f, search: v })) }

  // small improvement to search: require all tokens present (AND semantics) and include whatYoullLearn + insights + filter_tags
  const visible = useMemo(()=>{
    const raw = (activeFilters.search || '').trim().toLowerCase()
    const tokens = raw.length ? raw.split(/\s+/).filter(Boolean) : []

    let list = courses.filter(course=>{
      const tags = (course.analytics && Array.isArray(course.analytics.filter_tags) && course.analytics.filter_tags.length) ? course.analytics.filter_tags : deriveTagsFromCourse(course)
      const courseRating = course.Rating || 0
      const courseEnroll = (course.analytics && course.analytics.enrollments) || course.enrollments || 0

      if(tokens.length){
        const textParts = [course.title||'', (course.whatYoullLearn||[]).join(' '), course.description||'', tags.join(' '), course.analytics?.insight?.reason||'', (course.keywords||[]).join(' ')]
        const text = textParts.join(' ').toLowerCase()
        // require all tokens to be present
        const matchedAll = tokens.every(t=> text.includes(t))
        if(!matchedAll) return false
      }
      if(courseRating < activeFilters.rating) return false
      if(courseEnroll < activeFilters.enrollment) return false
      if(activeFilters.level && course.level !== activeFilters.level) return false

      if(activeFilters.topic.size > 0){
        const topicTags = tags.filter(t=> !['Beginner','Intermediate','Expert'].includes(t) && !t.includes('('))
        const matched = topicTags.some(t=> activeFilters.topic.has(t))
        if(!matched) return false
      }

      if(activeFilters.duration.size > 0){
        const durationTags = tags.filter(t=> t.includes('('))
        const matched = durationTags.some(t=> activeFilters.duration.has(t))
        if(!matched) return false
      }

      return true
    })

    const copy = [...list]
    switch(activeFilters.sort){
      case 'ai_score_desc': copy.sort((a,b)=> (b.analytics?.final_comparison_score||0)-(a.analytics?.final_comparison_score||0)); break
      case 'rating_desc': copy.sort((a,b)=> (b.Rating||0)-(a.Rating||0)); break
      case 'duration_asc': copy.sort((a,b)=> (a.totalHours||0)-(b.totalHours||0)); break
      case 'popularity_desc': copy.sort((a,b)=> (b.analytics?.enrollments||0)-(a.analytics?.enrollments||0)); break
      case 'title_asc': copy.sort((a,b)=> (a.title||'').localeCompare(b.title||'')); break
      default: break
    }

    return copy
  }, [courses, activeFilters])

  const total = visible.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  useEffect(()=>{ if(page > totalPages) setPage(totalPages) }, [totalPages])
  const paged = visible.slice((page-1)*pageSize, page*pageSize)

  function clearFilter(key, value){
    if(key === 'search') setActiveFilters(f=> ({ ...f, search: '' }))
    else if(key === 'level') setActiveFilters(f=> ({ ...f, level: '' }))
    else if(key === 'rating') setActiveFilters(f=> ({ ...f, rating: 0 }))
    else if(key === 'enrollment') setActiveFilters(f=> ({ ...f, enrollment: 0 }))
    else if(key === 'sort') setActiveFilters(f=> ({ ...f, sort: 'ai_score_desc' }))
    else if(key === 'topic') setActiveFilters(f=> ({ ...f, topic: new Set() }))
    else if(key === 'duration') setActiveFilters(f=> ({ ...f, duration: new Set() }))
    else if(typeof key === 'string' && key.includes(':')){
      const [base, ...rest] = key.split(':')
      const val = rest.join(':')
      if(base === 'topic') setActiveFilters(f=> ({ ...f, topic: new Set(Array.from(f.topic).filter(x=> x !== val)) }))
      if(base === 'duration') setActiveFilters(f=> ({ ...f, duration: new Set(Array.from(f.duration).filter(x=> x !== val)) }))
    } else if(key && value){
      // support remove of single entry passed as (key, value)
      if(key === 'topic') setActiveFilters(f=> ({ ...f, topic: new Set(Array.from(f.topic).filter(x=> x !== value)) }))
      if(key === 'duration') setActiveFilters(f=> ({ ...f, duration: new Set(Array.from(f.duration).filter(x=> x !== value)) }))
    }
  }

  // Apply dark ambient theme when any non-default filter active
  useEffect(()=>{
    const any = activeFilters.level || activeFilters.topic.size>0 || activeFilters.duration.size>0 || activeFilters.rating>0 || activeFilters.enrollment>0 || (activeFilters.search && activeFilters.search.length>0)
    if(any) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [activeFilters])

  // helper to toggle only the clicked filter (do not auto-open other filters)
  function toggleSection(key){
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function isSectionOpen(key){
    return !!expanded[key] || hoverSection === key
  }

  // UI: render filters as toolbar above the course grid; each section has its own collapsible panel
  return (
    <div className="expanded-stage">
      <div className="rounded-xl p-6">
        <div className="hero-content text-gray-900 dark:text-white">
          <Header onSearch={setSearch} />

          <div className="mt-6 p-6 bg-white/95 dark:bg-gray-800/90 rounded-lg text-gray-900 dark:text-gray-100">
            <div className="flex flex-col gap-6 mb-6">
              {/* Filters toolbar (moved above cards) */}
              <div className="filters-toolbar border-b pb-4">
                <div className="flex flex-wrap gap-3 items-start">
                  {[
                    { key: 'sort', label: 'Sort' },
                    { key: 'level', label: 'Level' },
                    { key: 'topic', label: 'Topics' },
                    { key: 'duration', label: 'Duration' },
                    { key: 'rating', label: 'Rating' },
                    { key: 'enrollment', label: 'Enrollments' },
                  ].map(f=> (
                    <div key={f.key} className="filter-section" onMouseEnter={()=> setHoverSection(f.key)} onMouseLeave={()=> setHoverSection(null)}>
                      <button type="button" onClick={()=> toggleSection(f.key)} className="filter-header px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-sm font-medium">{f.label}</button>
                      {isSectionOpen(f.key) && (
                        <div className="filter-panel mt-2 p-3 bg-white dark:bg-gray-800 border rounded">
                          {/* render section content by key */}
                          {f.key === 'sort' && (
                            <div className="grid gap-2">
                              {['ai_score_desc','rating_desc','duration_asc','popularity_desc','title_asc'].map(k=> (
                                <label key={k} className="radio-item text-sm dark:text-gray-200"><input type="radio" name="sortRadioInline" value={k} checked={activeFilters.sort===k} onChange={()=> setSort(k)} className="mr-2" />{k==='ai_score_desc'?'AI Score (Best Match)':k==='rating_desc'?'Highest Rating':k==='duration_asc'?'Duration (Shortest First)':k==='popularity_desc'?'Popularity':'Title (A-Z)'}</label>
                              ))}
                            </div>
                          )}

                          {f.key === 'level' && (
                            <div className="grid gap-2">
                              <label className="radio-item text-sm dark:text-gray-200"><input type="radio" name="levelRadioInline" value="" checked={activeFilters.level==='' } onChange={()=> setLevel('')} className="mr-2" />Any</label>
                              {/* ensure Intermediate option exists */}
                              {['Beginner','Intermediate','Expert'].concat(uniqueTags.level.filter(l=> !['Beginner','Intermediate','Expert'].includes(l))).map(l=> (
                                <label key={l} className="radio-item text-sm dark:text-gray-200"><input type="radio" name="levelRadioInline" value={l} checked={activeFilters.level===l} onChange={()=> setLevel(l)} className="mr-2" />{l}</label>
                              ))}
                            </div>
                          )}

                          {f.key === 'topic' && (
                            <div className="grid gap-2 max-h-40 overflow-auto">
                              {uniqueTags.topic.map(t=> (
                                <label key={t} className="checkbox-item text-sm dark:text-gray-200"><input type="checkbox" data-filtertype="topic" value={t} checked={activeFilters.topic.has(t)} onChange={()=> toggleSet('topic', t)} className="mr-2" />{t}</label>
                              ))}
                            </div>
                          )}

                          {f.key === 'duration' && (
                            <div className="grid gap-2 max-h-40 overflow-auto">
                              {uniqueTags.duration.map(d=> (
                                <label key={d} className="checkbox-item text-sm dark:text-gray-200"><input type="checkbox" data-filtertype="duration" value={d} checked={activeFilters.duration.has(d)} onChange={()=> toggleSet('duration', d)} className="mr-2" />{d}</label>
                              ))}
                            </div>
                          )}

                          {f.key === 'rating' && (
                            <div className="grid gap-2">
                              <label className="radio-item text-sm dark:text-gray-200"><input type="radio" name="minRatingRadioInline" value="4.5" checked={activeFilters.rating===4.5} onChange={()=> setRating(4.5)} className="mr-2" />4.5 ★ & Up</label>
                              <label className="radio-item text-sm dark:text-gray-200"><input type="radio" name="minRatingRadioInline" value="4.0" checked={activeFilters.rating===4.0} onChange={()=> setRating(4.0)} className="mr-2" />4.0 ★ & Up</label>
                              <label className="radio-item text-sm dark:text-gray-200"><input type="radio" name="minRatingRadioInline" value="0" checked={activeFilters.rating===0} onChange={()=> setRating(0)} className="mr-2" />Any Rating</label>
                            </div>
                          )}

                          {f.key === 'enrollment' && (
                            <div className="grid gap-2">
                              <label className="radio-item text-sm dark:text-gray-200"><input type="radio" name="minEnrollmentsInline" value="50000" checked={activeFilters.enrollment===50000} onChange={()=> setEnrollment(50000)} className="mr-2" />50,000+</label>
                              <label className="radio-item text-sm dark:text-gray-200"><input type="radio" name="minEnrollmentsInline" value="10000" checked={activeFilters.enrollment===10000} onChange={()=> setEnrollment(10000)} className="mr-2" />10,000+</label>
                              <label className="radio-item text-sm dark:text-gray-200"><input type="radio" name="minEnrollmentsInline" value="5000" checked={activeFilters.enrollment===5000} onChange={()=> setEnrollment(5000)} className="mr-2" />5,000+</label>
                              <label className="radio-item text-sm dark:text-gray-200"><input type="radio" name="minEnrollmentsInline" value="0" checked={activeFilters.enrollment===0} onChange={()=> setEnrollment(0)} className="mr-2" />Any</label>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  ))}

                 </div>

               </div>

               {/* Main content: course list + active filters */}
               <div className="flex flex-col lg:flex-row gap-6">
                 <div className="w-full lg:w-3/4">
                   <div className="flex items-center justify-between mb-4">
                     <h2 className="text-2xl font-bold">Course Explorer</h2>
                     <div className="text-sm text-gray-600 dark:text-gray-300">Showing {Math.min(total, pageSize*(page-1)+paged.length)} of {total} courses</div>
                   </div>

                   <div className="mb-4">
                     <p className="text-gray-700 dark:text-gray-300">Browse curated courses. Click a course to open provider page. Use the search box to quickly find topics like 'RAG' or 'Bedrock'.</p>
                   </div>

                   {/* show active filter tags above the grid */}
                   <div className="mb-4">
                     <ActiveFilters filters={activeFilters} onRemove={clearFilter} />
                   </div>

                   <CourseGrid courses={paged} compact={compactView} />

                   <div className="flex items-center justify-between mt-6">
                     <div className="text-sm text-gray-600 dark:text-gray-300">Page {page} of {totalPages}</div>
                     <div className="flex gap-2">
                       <button onClick={()=> setPage(p=> Math.max(1,p-1))} disabled={page<=1} className={`px-4 py-2 rounded ${page<=1? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-700':'bg-white border'} text-sm`}>Previous</button>
                       <button onClick={()=> setPage(p=> Math.min(totalPages,p+1))} disabled={page>=totalPages} className={`px-4 py-2 rounded ${page>=totalPages? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-700':'bg-blue-600 text-white'} text-sm`}>Next</button>
                     </div>
                   </div>

                 </div>

                 {/* no sidebar; filters are top-aligned above the grid */}
               </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
