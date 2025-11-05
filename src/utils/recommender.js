// Recommender util: scoring and tag generation

function clamp(v, a=0, b=1){
  if (v==null || Number.isNaN(v)) return a
  return Math.max(a, Math.min(b, v))
}

function normalizeScore(v){
  return clamp(Number(v))
}

function extractFilterTags(course){
  const tags = new Set()
  const f = course.analytics?.filter_tags || []
  f.forEach(t=> tags.add(String(t).trim()))
  return Array.from(tags)
}

export function generateTags(course, userPrefs={}){
  const tags = []
  const analytics = course.analytics || {}
  const sa = analytics.sentiment_analysis || {}
  const composite = analytics.composite_scores || {}
  const features = analytics.content_features || {}
  const filterTags = extractFilterTags(course)

  // add filter tags as topic tags
  filterTags.forEach(t=> tags.push({name:t, type:'topic', source:'filter_tags'}))

  // strength tags
  const strengths = sa.detected_strengths || []
  strengths.forEach(s=> tags.push({name:s, type:'interest', source:'sentiment'}))

  // pain points -> weakness
  const pains = sa.detected_pain_points || []
  pains.forEach(p=> tags.push({name:p, type:'weakness', source:'sentiment'}))

  // composite derived badges (use safe fallbacks and clamp values)
  const normRating = clamp(analytics.normalized_rating || 0)
  const normPopularity = clamp(analytics.normalized_popularity || 0)
  const freshScore = clamp((composite.content_freshness_score) || analytics.content_freshness_score || 0)
  const engagementScore = clamp((composite.course_engagement_score) || analytics.course_engagement_score || 0)

  if (normRating >= 0.9) tags.push({name:'Top Rated', type:'badge', source:'normalized_rating'})
  if (normPopularity >= 0.6) tags.push({name:'Popular', type:'badge', source:'normalized_popularity'})
  if (freshScore >= 0.7) tags.push({name:'Fresh Content', type:'badge', source:'content_freshness_score'})
  if (engagementScore >= 0.75) tags.push({name:'High Engagement', type:'badge', source:'course_engagement_score'})
  if (features.has_capstone_project) tags.push({name:'Capstone Project', type:'badge', source:'content_features'})

  // explicit score tag
  if (typeof analytics.final_comparison_score === 'number') tags.push({name:`Score: ${Math.round(analytics.final_comparison_score)}`, type:'score', source:'final_comparison_score'})

  // expose key numeric metrics as compact metric tags (for UI visibility)
  const rel = (analytics.relevance_score != null) ? Number(analytics.relevance_score) : null
  const normR = (analytics.normalized_rating != null) ? Number(analytics.normalized_rating) : null
  const pop = (analytics.normalized_popularity != null) ? Number(analytics.normalized_popularity) : null
  const fresh = (composite.content_freshness_score != null) ? Number(composite.content_freshness_score) : (analytics.content_freshness_score != null ? Number(analytics.content_freshness_score) : null)
  const engage = (composite.course_engagement_score != null) ? Number(composite.course_engagement_score) : (analytics.course_engagement_score != null ? Number(analytics.course_engagement_score) : null)
  const sent = (sa.sentiment_score != null) ? Number(sa.sentiment_score) : null

  if (rel != null) tags.push({name:`Relevance: ${Number(rel).toFixed(2)}`, type:'metric', source:'relevance_score', value: rel})
  if (normR != null) tags.push({name:`Rating: ${Number(normR).toFixed(2)}`, type:'metric', source:'normalized_rating', value: normR})
  if (pop != null) tags.push({name:`Popularity: ${Number(pop).toFixed(2)}`, type:'metric', source:'normalized_popularity', value: pop})
  if (fresh != null) tags.push({name:`Freshness: ${Number(fresh).toFixed(2)}`, type:'metric', source:'content_freshness_score', value: fresh})
  if (engage != null) tags.push({name:`Engagement: ${Number(engage).toFixed(2)}`, type:'metric', source:'course_engagement_score', value: engage})
  if (sent != null) tags.push({name:`Sentiment: ${Number(sent).toFixed(2)}`, type:'metric', source:'sentiment_score', value: sent})

  // normalize names, dedupe
  const map = new Map()
  for(const t of tags){
    const n = String(t.name).trim()
    const key = n.toLowerCase()
    if (!map.has(key)) map.set(key, {...t, name:n, match:false})
    else {
      // merge types: badge > topic > interest > weakness > score
      const existing = map.get(key)
      if (existing.type === 'weakness' && t.type === 'interest') existing.type = 'mixed'
      if (existing.type === 'interest' && t.type === 'weakness') existing.type = 'mixed'
      // prefer badge if any
      if (t.type==='badge') existing.type = 'badge'
    }
  }

  // validate against user prefs (topics, skills, maxHours, level)
  const prefs = userPrefs || {}
  const chosenTopics = (prefs.topics||[]).map(x=>String(x).toLowerCase())
  const maxHours = prefs.maxHours ? Number(prefs.maxHours) : null
  for(const [k,v] of map.entries()){
    if (chosenTopics.includes(k)) v.match = true
    // duration mismatch
    if (maxHours && course.totalHours && Number(course.totalHours) > maxHours) v.durationMismatch = true
  }

  return Array.from(map.values())
}

// compute top contributing drivers used in the score (for explanation in UI)
function computeDrivers(analytics = {}, weights = {}){
  const finalNorm = clamp(analytics.final_comparison_score ? analytics.final_comparison_score/100 : 0)
  const relevance = clamp(analytics.relevance_score || 0)
  const rating = clamp(analytics.normalized_rating || 0)
  const popularity = clamp(analytics.normalized_popularity || 0)
  const engagement = clamp((analytics.composite_scores && analytics.composite_scores.course_engagement_score) || analytics.course_engagement_score || 0)
  const freshness = clamp((analytics.composite_scores && analytics.composite_scores.content_freshness_score) || analytics.content_freshness_score || 0)
  const sentiment = clamp((analytics.sentiment_analysis && analytics.sentiment_analysis.sentiment_score) || 0)
  const capstone = (analytics.content_features && analytics.content_features.has_capstone_project) ? 1 : 0

  const w = Object.assign({
    final_comparison: 0.30,
    relevance: 0.20,
    rating: 0.15,
    popularity: 0.10,
    engagement: 0.07,
    freshness: 0.05,
    sentiment: 0.05,
    capstone: 0.03
  }, weights || {})

  const drivers = [
    { key:'final_comparison', name:'Final Comparison', weight:w.final_comparison, value:finalNorm, contribution: w.final_comparison * finalNorm },
    { key:'relevance', name:'Relevance', weight:w.relevance, value:relevance, contribution: w.relevance * relevance },
    { key:'rating', name:'Rating', weight:w.rating, value:rating, contribution: w.rating * rating },
    { key:'popularity', name:'Popularity', weight:w.popularity, value:popularity, contribution: w.popularity * popularity },
    { key:'engagement', name:'Engagement', weight:w.engagement, value:engagement, contribution: w.engagement * engagement },
    { key:'freshness', name:'Freshness', weight:w.freshness, value:freshness, contribution: w.freshness * freshness },
    { key:'sentiment', name:'Sentiment', weight:w.sentiment, value:sentiment, contribution: w.sentiment * sentiment },
    { key:'capstone', name:'Capstone', weight:w.capstone, value:capstone, contribution: w.capstone * capstone }
  ]

  drivers.sort((a,b)=> b.contribution - a.contribution)
  return drivers
}

export function scoreCourse(course, userPrefs={}){
  const analytics = course.analytics || {}
  const final = clamp(analytics.final_comparison_score ? analytics.final_comparison_score/100 : (analytics.relevance_score || 0))
  // weights
  const weights = Object.assign({
    final_comparison: 0.30,
    relevance: 0.20,
    rating: 0.15,
    popularity: 0.10,
    engagement: 0.07,
    freshness: 0.05,
    sentiment: 0.05,
    capstone: 0.03
  }, userPrefs.weights || {})

  const finalNorm = clamp(analytics.final_comparison_score ? analytics.final_comparison_score/100 : 0)
  const relevance = clamp(analytics.relevance_score || 0)
  const rating = clamp(analytics.normalized_rating || 0)
  const popularity = clamp(analytics.normalized_popularity || 0)
  const engagement = clamp((analytics.composite_scores && analytics.composite_scores.course_engagement_score) || analytics.course_engagement_score || 0)
  const freshness = clamp((analytics.composite_scores && analytics.composite_scores.content_freshness_score) || analytics.content_freshness_score || 0)
  const sentiment = clamp((analytics.sentiment_analysis && analytics.sentiment_analysis.sentiment_score) || 0)
  const capstoneBonus = (analytics.content_features && analytics.content_features.has_capstone_project) ? 1 : 0

  let score = 0
  score += weights.final_comparison * finalNorm
  score += weights.relevance * relevance
  score += weights.rating * rating
  score += weights.popularity * popularity
  score += weights.engagement * engagement
  score += weights.freshness * freshness
  score += weights.sentiment * sentiment
  score += weights.capstone * capstoneBonus

  // level match bonus/penalty
  const userLevel = (userPrefs.level || '').toLowerCase()
  const courseLevel = (course.level || '').toLowerCase()
  if (userLevel){
    if (courseLevel === userLevel) score += 0.2
    else score -= 0.1
  }

  return clamp(score, 0, 1)
}

export function recommend(courses, userPrefs={}){
  // ensure we use the same weights for drivers as used during scoring
  const weights = Object.assign({
    final_comparison: 0.30,
    relevance: 0.20,
    rating: 0.15,
    popularity: 0.10,
    engagement: 0.07,
    freshness: 0.05,
    sentiment: 0.05,
    capstone: 0.03
  }, userPrefs.weights || {})

  const scored = courses.map(c=> {
    const _score = scoreCourse(c, userPrefs)
    const _tags = generateTags(c, userPrefs)
    const _drivers = computeDrivers(c.analytics || {}, weights).slice(0,3).map(d=> ({name:d.name, contribution: Number((d.contribution).toFixed(3)), value: Number((d.value).toFixed(3))}))
    return {...c, _score, _tags, _drivers}
  })
  scored.sort((a,b)=> b._score - a._score)
  return scored
}
