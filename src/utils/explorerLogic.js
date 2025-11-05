export function applySorting(courses, sortKey){
  const copy = [...courses]
  switch(sortKey){
    case 'ai_score_desc': return copy.sort((a,b)=> (b.analytics?.final_comparison_score||0)-(a.analytics?.final_comparison_score||0))
    case 'rating_desc': return copy.sort((a,b)=> (b.Rating||0)-(a.Rating||0))
    case 'duration_asc': return copy.sort((a,b)=> (a.totalHours||0)-(b.totalHours||0))
    case 'title_asc': return copy.sort((a,b)=> (a.title||'').localeCompare(b.title||''))
    default: return copy
  }
}
