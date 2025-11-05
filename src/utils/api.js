export async function fetchAllCourses(){
  // updated to use final_* datasets generated for each level
  const files = ['/final_beginner_courses.json','/final_intermediate_courses.json','/final_expert_courses.json']
  const results = []
  for(const f of files){
    try{
      const res = await fetch(f)
      if(!res.ok) continue
      const data = await res.json()
      results.push(...data)
    }catch(e){
      console.warn('failed to fetch', f, e)
    }
  }
  // normalize
  return results.map(c=>({
    ...c,
    level: (c.level || c.Level || 'Beginner'),
    Rating: parseFloat(c.ratingValue) || parseFloat(c.Rating) || 0,
    totalHours: parseFloat(c.totalHours) || 0,
    ImageURL: c.imageSrc || c.image || ''
  }))
}
