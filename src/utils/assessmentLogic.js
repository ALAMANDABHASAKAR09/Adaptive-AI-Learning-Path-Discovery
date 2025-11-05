import { ALL_QUESTIONS, STAGE_WEIGHTS, ALL_DOMAINS } from '../data/assessmentData'

// New adaptive assessment utilities (Refined Bucket Model)

function shuffleArray(arr){
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
  }
}

export function preprocessQuestionBank(allQuestions = []){
  const questionPool = {}
  const seen = new Set()
  allQuestions.forEach(q => {
    // compute stable key for deduplication
    const qKey = q.id != null ? String(q.id) : `${q.tag||'General'}:${(q.text||'').slice(0,120)}`
    if(seen.has(qKey)) return
    seen.add(qKey)

    const tag = q.tag || 'General'
    if(tag === 'Profiler'){
      questionPool['Profiler'] = questionPool['Profiler'] || []
      questionPool['Profiler'].push(q)
      return
    }
    questionPool[tag] = questionPool[tag] || {}
    const diff = Math.max(1, Math.min(10, Number(q.difficulty) || 5))
    questionPool[tag][diff] = questionPool[tag][diff] || []
    questionPool[tag][diff].push(q)
  })

  // ensure every tag has buckets 1..10
  Object.keys(questionPool).forEach(tag => {
    if(tag === 'Profiler'){
      shuffleArray(questionPool[tag])
      return
    }
    for(let d=1; d<=10; d++){
      questionPool[tag][d] = questionPool[tag][d] || []
      shuffleArray(questionPool[tag][d])
    }
  })

  return questionPool
}

// Score short/long written answer by simple keyword matching against scoringTags
export function scoreWrittenAnswer(answerText = '', scoringTags = {}, minLength = 0){
  const text = (answerText || '').toLowerCase()
  const words = text.split(/\W+/).filter(Boolean)
  const wordCount = words.length
  const result = { wordCount, tagScores: {} }

  if(wordCount < (minLength || 0)){
    // too short — all zeros
    Object.keys(scoringTags || {}).forEach(tag => { result.tagScores[tag] = 0 })
    return result
  }

  Object.entries(scoringTags || {}).forEach(([tag, lists]) => {
    const prim = (lists.primary || []).map(s=> s.toLowerCase())
    const sec = (lists.secondary || []).map(s=> s.toLowerCase())
    let primFound = 0, secFound = 0
    prim.forEach(k => { if(k && text.includes(k)) primFound++ })
    sec.forEach(k => { if(k && text.includes(k)) secFound++ })
    const denom = Math.max(1, prim.length + 0.5 * sec.length)
    const score = Math.min(1, (primFound + 0.5 * secFound) / denom)
    result.tagScores[tag] = Number(score.toFixed(3))
  })

  return result
}

// helper to check if a question ID was already asked
function questionsAskedHas(userProfile, qid){
  const q = userProfile && userProfile.questionsAsked
  if(!q) return false
  if(q instanceof Set) return q.has(qid)
  if(Array.isArray(q)) return q.includes(qid)
  if(typeof q === 'object') return !!q[qid]
  return false
}

// Select next question according to userProfile and pool. Returns { question, updatedTagsToTest }
export function selectNextQuestion(userProfile, questionPool, allTags = []){
  if(!userProfile) return { question: null, updatedTagsToTest: userProfile?.tagsToTest || [] }
  // Profiler mode
  if(userProfile.isBeginnerPivot){
    const prof = questionPool['Profiler'] || []
    const q = prof.find(qi => !questionsAskedHas(userProfile, qi.id)) || null
    return { question: q, updatedTagsToTest: userProfile.tagsToTest }
  }

  // ensure tagsToTest is populated
  let tagsToTest = Array.isArray(userProfile.tagsToTest) ? [...userProfile.tagsToTest] : []
  if(tagsToTest.length === 0){
    // refill with shuffled allTags
    tagsToTest = [...allTags]
    shuffleArray(tagsToTest)
  }

  // find next tag
  let nextTag = tagsToTest.shift()
  const attempts = [0]
  let selected = null

  // helper to find nearest non-empty bucket
  function findForTag(t, target){
    const buckets = questionPool[t] || {}
    if(!buckets) return null
    if(Array.isArray(buckets[target]) && buckets[target].length){
      // pop to avoid reuse
      return buckets[target].pop()
    }
    // search outward
    for(let offset=1; offset<=9; offset++){
      const up = target + offset
      const down = target - offset
      if(up <= 10 && Array.isArray(buckets[up]) && buckets[up].length) return buckets[up].pop()
      if(down >=1 && Array.isArray(buckets[down]) && buckets[down].length) return buckets[down].pop()
    }
    return null
  }

  // loop through tagsToTest (including the popped nextTag) until a question found
  let searchTags = [nextTag, ...tagsToTest]
  for(const t of searchTags){
    if(!t) continue
    const targetDifficulty = Math.max(1, Math.min(10, Number(userProfile.tagLevels[t] || 5)))
    const candidate = findForTag(t, targetDifficulty)
    if(candidate && !questionsAskedHas(userProfile, candidate.id)){
      selected = candidate
      // ensure nextTag list does not include t (we already consumed it)
      const remaining = tagsToTest.filter(x=> x!==t)
      return { question: selected, updatedTagsToTest: remaining }
    }
  }

  // If nothing found across these tags, try any tag buckets remaining
  for(const t of allTags){
    const targetDifficulty = Math.max(1, Math.min(10, Number(userProfile.tagLevels[t] || 5)))
    const candidate = findForTag(t, targetDifficulty)
    if(candidate && !questionsAskedHas(userProfile, candidate.id)){
      return { question: candidate, updatedTagsToTest: tagsToTest }
    }
  }

  return { question: null, updatedTagsToTest: tagsToTest }
}

// Update profile after an answered question; returns updated profile object (does not mutate input)
export function updateProfile(userProfile, question, answer, isCorrect, writtenScores){
  // shallow clone baseline fields to avoid JSON stringify losing Sets
  const up = {
    isActive: userProfile?.isActive,
    isComplete: userProfile?.isComplete,
    currentQuestionIndex: typeof userProfile?.currentQuestionIndex === 'number' ? userProfile.currentQuestionIndex : 0,
    questionsAsked: new Set(Array.isArray(userProfile?.questionsAsked) ? userProfile.questionsAsked : (userProfile?.questionsAsked instanceof Set ? Array.from(userProfile.questionsAsked) : [])),
    tagsToTest: Array.isArray(userProfile?.tagsToTest) ? [...userProfile.tagsToTest] : [],
    tagLevels: { ...(userProfile?.tagLevels || {}) },
    tagScores: { ...(userProfile?.tagScores || {}) },
    isBeginnerPivot: !!userProfile?.isBeginnerPivot,
    profilerAnswers: { ...(userProfile?.profilerAnswers || {}) },
    firstFourHistory: Array.isArray(userProfile?.firstFourHistory) ? [...userProfile.firstFourHistory] : []
  }

  // record this question
  up.questionsAsked.add(question.id)
  // increment answered count (currentQuestionIndex represents number answered)
  up.currentQuestionIndex = (up.currentQuestionIndex || 0) + 1

  // initialize tagScores for tag if needed
  const tag = question.tag || 'General'
  up.tagScores[tag] = up.tagScores[tag] || { correct:0, total:0, weightedScore:0 }
  up.tagScores[tag].total += 1
  if(isCorrect) up.tagScores[tag].correct += 1
  // incorporate difficulty as weight
  const diff = Number(question.difficulty) || 5
  if(isCorrect) up.tagScores[tag].weightedScore = (up.tagScores[tag].weightedScore || 0) + diff

  // adjust estimated level for the tag (except profiler)
  if(tag !== 'Profiler'){
    up.tagLevels[tag] = up.tagLevels[tag] || 5
    const delta = isCorrect ? 1 : -1
    up.tagLevels[tag] = Math.max(1, Math.min(10, up.tagLevels[tag] + delta))
  } else {
    // store profiler answers
    up.profilerAnswers = up.profilerAnswers || {}
    up.profilerAnswers[question.id] = answer
  }

  // record firstFourHistory for beginner pivot logic
  up.firstFourHistory = up.firstFourHistory || []
  if(up.firstFourHistory.length < 4){
    up.firstFourHistory.push(isCorrect)
    if(up.firstFourHistory.length > 4) up.firstFourHistory = up.firstFourHistory.slice(0,4)
  }
  // check pivot after 4 answers
  const wrongCount = up.firstFourHistory.filter(v=> v===false).length
  if(up.firstFourHistory.length === 4 && wrongCount >= 3){
    up.isBeginnerPivot = true
    up.tagsToTest = ['Profiler']
  }

  return up
}

// Generate the final profile object from userProfile
export function generateFinalProfile(userProfile, allQuestions = []){
  if(!userProfile) return null
  if(userProfile.isBeginnerPivot){
    // map profiler answers to interest tags/goals
    const interestTags = new Set()
    const mappings = {}
    // build mapping from questions
    allQuestions.filter(q=> q.tag === 'Profiler').forEach(q=> {
      mappings[q.id] = q.profilerMapping || {}
    })
    Object.entries(userProfile.profilerAnswers || {}).forEach(([qid, answer]) => {
      const map = mappings[qid] || {}
      if(typeof answer === 'string' && map[answer]){
        const v = map[answer]
        if(v.interestTag) interestTags.add(v.interestTag)
        if(v.goal) interestTags.add(v.goal)
      }
      // if multi-select answers, handle arrays
      if(Array.isArray(answer)){
        answer.forEach(a=> { const v = map[a]; if(v){ if(v.interestTag) interestTags.add(v.interestTag); if(v.goal) interestTags.add(v.goal) } })
      }
    })

    return {
      finalLevel: 'Beginner',
      interestTags: Array.from(interestTags),
      // provide defaults so UI can display a profile even for beginner/profiler flows
      overallPct: 0,
      weaknessTags: [],
      tagProfile: {},
      level: 'Beginner',
      overallScorePercentage: 0,
      levelTagGroups: { beginner: [], intermediate: [], expert: [] }
    }
  }

  // For technical path: compute weighted scores per tag and overall
  const tagLevels = userProfile.tagLevels || {}
  const tagScores = userProfile.tagScores || {}

  // compute a normalized score per tag (0..1) based on weightedScore and max possible weight estimation
  const tagPercentages = {}
  Object.keys(tagLevels).forEach(tag => {
    const ts = tagScores[tag] || { correct:0, total:0, weightedScore:0 }
    const maxPossible = (ts.total || 0) * 10 // assume max diff 10 per answered question
    tagPercentages[tag] = maxPossible > 0 ? (ts.weightedScore || 0) / maxPossible : 0
  })

  // overall score average (tag-based fallback)
  const avg = Object.values(tagPercentages).reduce((s,v)=> s+v,0) / Math.max(1, Object.keys(tagPercentages).length)
  let computedPct = Math.round(avg * 100)

  // If computedPct is unintentionally small (single-digit), scale by 10 as a user-requested heuristic
  if(computedPct > 0 && computedPct < 10){ computedPct = Math.min(100, computedPct * 10) }

  // Count total correct answers across tags and total answered
  const totalCorrect = Object.values(tagScores || {}).reduce((s,ts)=> s + (ts.correct || 0), 0)
  const totalAnswered = Object.values(tagScores || {}).reduce((s,ts)=> s + (ts.total || 0), 0)

  // Prefer accuracy (correct/answered) as the profile percent when we have answered questions
  let overallPct = 0
  if(totalAnswered > 0){
    overallPct = Math.round((totalCorrect / totalAnswered) * 100)
  } else {
    overallPct = computedPct
  }

  // Determine level primarily by correctness-count thresholds if available
  // user requested thresholds: 6+ correct -> Expert, 4-5 -> Intermediate, <=3 -> Beginner
  let finalLevel = 'Intermediate'
  if(totalAnswered > 0){
    if(totalCorrect >= 6) finalLevel = 'Expert'
    else if(totalCorrect >= 4) finalLevel = 'Intermediate'
    else finalLevel = 'Beginner'
  } else {
    // fallback to pct ranges
    if(overallPct >= 81) finalLevel = 'Expert'
    else if(overallPct >= 61) finalLevel = 'Intermediate'
    else finalLevel = 'Beginner'
  }

  // weakness tags where percentage < 0.5
  const weaknessTags = Object.keys(tagPercentages).filter(t=> (tagPercentages[t] || 0) < 0.5)

  // derive strong / interest tags (where performance is high)
  const strongTags = Object.keys(tagPercentages).filter(t => (tagPercentages[t] || 0) >= 0.7)
  // also compute top N tags by percentage as fallback
  const topTags = Object.entries(tagPercentages).sort((a,b)=> b[1]-a[1]).slice(0,3).map(e=> e[0])
  // also include tags that were frequently answered (tagScores.total) as potential interest
  const activeTags = Object.keys(tagScores).filter(t => (tagScores[t] && (tagScores[t].total || 0) > 0))
  const interestTags = Array.from(new Set([...(strongTags.length ? strongTags : topTags), ...activeTags]))

  // group tags by estimated level for easier UI filtering (based on tagLevels)
  const beginnerTags = Object.keys(tagLevels).filter(t => (tagLevels[t] || 5) <= 4)
  const intermediateTags = Object.keys(tagLevels).filter(t => (tagLevels[t] || 5) >=5 && (tagLevels[t] || 5) <=7)
  const expertTags = Object.keys(tagLevels).filter(t => (tagLevels[t] || 5) >=8)

  return {
    finalLevel,
    overallPct,
    weaknessTags,
    interestTags,
    tagProfile: tagLevels,
    level: finalLevel,
    overallScorePercentage: Math.round(overallPct),
    levelTagGroups: { beginner: beginnerTags, intermediate: intermediateTags, expert: expertTags },
    totalCorrect,
    totalAnswered
  }
}

// Recommendation generator compatible with both legacy and new profile shapes
export function generateRecommendations(results, courses = [], targetTopics = []){
  if(!results || !Array.isArray(courses)) return { topMatch: null, perLevel: {}, recommendations: [] }

  // normalize level strings (helper)
  function normalLevel(s){
    if(!s) return ''
    try{
      return String(s).replace(/_courses$/i, '').trim()
    }catch(e){ return String(s).trim() }
  }

  // prefer explicit level
  const level = normalLevel(results.level || results.finalLevel)
  const topics = Array.isArray(targetTopics) ? targetTopics : []

  // helper: pick top course in a list by analytics.final_comparison_score or normalized rating
  function pickTop(list){
    if(!list || !list.length) return null
    return list.slice().sort((a,b)=> ((b.analytics?.final_comparison_score||0) - (a.analytics?.final_comparison_score||0)) || ((b.normalized_rating||0)-(a.normalized_rating||0)) )[0]
  }

  const perLevel = { Beginner: null, Intermediate: null, Expert: null }
  ['Beginner','Intermediate','Expert'].forEach(lv => {
    // prefer exact normalized match
    let byLv = courses.filter(c => normalLevel(c.level) && normalLevel(c.level).toLowerCase() === lv.toLowerCase())
    // fallback: substring match or analytics.filter_tags contains level
    if(byLv.length === 0){
      byLv = courses.filter(c => {
        const lev = (c.level || '').toString().toLowerCase()
        const tags = Array.isArray(c.analytics?.filter_tags) ? c.analytics.filter_tags.map(t=> String(t).toLowerCase()) : []
        return lev.includes(lv.toLowerCase()) || tags.includes(lv.toLowerCase())
      })
    }
    perLevel[lv] = pickTop(byLv)
  })

  // pick topMatch: prefer courses matching user's level and interestTags/weaknessTags
  let topMatch = null
  // first attempt: exact normalized level pool
  let levelPool = courses.filter(c => normalLevel(c.level) && normalLevel(c.level).toLowerCase() === (level||'').toLowerCase())
  // fallback: substring or tags
  if(levelPool.length === 0){
    levelPool = courses.filter(c => {
      const lev = (c.level || '').toString().toLowerCase()
      const tags = Array.isArray(c.analytics?.filter_tags) ? c.analytics.filter_tags.map(t=> String(t).toLowerCase()) : []
      return lev.includes((level||'').toLowerCase()) || tags.includes((level||'').toLowerCase())
    })
  }

  if(levelPool.length){
    // score by matching interestTags > weaknessTags > topics
    const tags = Array.isArray(results.interestTags) && results.interestTags.length ? results.interestTags : (Array.isArray(results.weaknessTags) ? results.weaknessTags : [])
    const scored = levelPool.map(c => {
      const matchCount = (c.topics||[]).filter(t => tags.includes(t) || topics.includes(t)).length
      const score = (matchCount * 10) + (c.analytics?.final_comparison_score || 0)
      return { c, score }
    }).sort((a,b)=> b.score - a.score)
    topMatch = scored.length ? scored[0].c : pickTop(levelPool)
  }
  // fallback to perLevel user's level top
  if(!topMatch) topMatch = perLevel[level] || perLevel['Beginner'] || null

  // Build recommendations array: start with topMatch then add perLevel tops and best matching others
  const recSet = new Set()
  const recommendations = []
  function pushUnique(course){ if(!course) return; const key = course.link || course.title || course.index; if(recSet.has(key)) return; recSet.add(key); recommendations.push(course) }

  pushUnique(topMatch)
  // include one top per level (Beginner, Intermediate, Expert)
  ['Beginner','Intermediate','Expert'].forEach(lv => pushUnique(perLevel[lv]))

  // then include best matches across all courses by interestTags/weaknessTags
  const interest = Array.isArray(results.interestTags) ? results.interestTags : []
  const weakness = Array.isArray(results.weaknessTags) ? results.weaknessTags : []
  const preferTags = interest.length ? interest : weakness
  const others = courses.slice().map(c=> ({ c, score: (c.analytics?.final_comparison_score||0) + ((c.topics||[]).filter(t=> preferTags.includes(t)||topics.includes(t)).length * 5) }))
  others.sort((a,b)=> b.score - a.score)
  others.slice(0,10).forEach(o => pushUnique(o.c))

  // final fallback to first 3 if still empty
  if(recommendations.length === 0) recommendations.push(...courses.slice(0,3))

  return { topMatch, perLevel, recommendations: recommendations.slice(0,6) }
}

// Calculate results over an answers map (answers: { [qId]: answer })
export function calculateResults(answers = {}, statedLevel){
  let totalWeightedScore = 0
  let maxWeightedScore = 0
  const domainPerformance = {}
  const domainMax = {}

  (ALL_QUESTIONS || []).forEach(q => {
    const weight = (STAGE_WEIGHTS && STAGE_WEIGHTS[q.stage]) || 1
    const userAnswer = answers[q.id]
    let isCorrect = false

    // grade according to type
    if(['MCQ','MCQ-Matching','MCQ-Reorder','MCQ-Scenario'].includes(q.type)){
      isCorrect = userAnswer === q.correctAnswer
    } else if(q.type === 'MCMS'){
      const expected = Array.isArray(q.correctAnswers) ? q.correctAnswers.slice().sort() : []
      const got = Array.isArray(userAnswer) ? userAnswer.slice().sort() : []
      isCorrect = JSON.stringify(expected) === JSON.stringify(got)
    } else if(q.type === 'ShortAnswer' || q.type === 'LongAnswer'){
      // ensure minimal length and scoringTags handled
      const writtenScores = scoreWrittenAnswer(userAnswer || '', q.scoringTags || {}, q.minLength || 0)
      // consider correct if any tag score >= 0.7
      isCorrect = Object.values(writtenScores.tagScores || {}).some(s => s >= 0.7)
    } else {
      // unknown types: fallback to length check
      if(typeof userAnswer === 'string'){
        const wordCount = (userAnswer||'').split(/\s+/).filter(Boolean).length
        isCorrect = wordCount >= (q.minLength||0)
      }
    }

    if(isCorrect) totalWeightedScore += weight
    maxWeightedScore += weight

    // domains support: attribute to q.domains if present, otherwise to q.tag
    const domains = Array.isArray(q.domains) && q.domains.length ? q.domains : [q.tag || 'General']
    domains.forEach(d=>{
      domainPerformance[d] = domainPerformance[d] || 0
      domainMax[d] = domainMax[d] || 0
      domainMax[d] += weight
      if(isCorrect) domainPerformance[d] += weight
    })
  })

  const overallScorePercentage = maxWeightedScore>0 ? (totalWeightedScore / maxWeightedScore) : 0
  let level = 'Beginner'
  if(overallScorePercentage >= 0.75) level = 'Expert'
  else if(overallScorePercentage >= 0.45) level = 'Intermediate'

  let finalLevel = level
  if(statedLevel === 'Advanced/Expert' && level !== 'Expert') finalLevel = level
  if(statedLevel === 'Intermediate/Practical' && level === 'Beginner') finalLevel = 'Beginner'

  const weakDomains = (ALL_DOMAINS || []).filter(domain => {
    const score = domainPerformance[domain] || 0
    const max = domainMax[domain] || 1
    return (score / max) < 0.5
  })

  return {
    totalWeightedScore, maxWeightedScore,
    overallScorePercentage: Math.round(overallScorePercentage*100),
    level: finalLevel,
    domainPerformance, domainMax, weakDomains
  }
}
