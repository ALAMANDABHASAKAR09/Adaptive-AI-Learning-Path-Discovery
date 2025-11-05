import React, { useEffect, useState } from 'react'
import DomainAnalysis from './Results/DomainAnalysis'
import RecommendationCard from './Results/RecommendationCard'
import { generateFinalProfile } from '../../utils/assessmentLogic'
import { recommend } from '../../utils/recommender'
import { fetchAllCourses } from '../../utils/api'

export default function Step6_Results({ results, userProfile, allQuestions, courses, generateRecommendations }){
  const [fetchedCourses, setFetchedCourses] = useState(null)
  const [fallbackRecsFromFetch, setFallbackRecsFromFetch] = useState(null)

  // if results missing, try to derive from userProfile
  let finalResults = results
  if(!finalResults && userProfile){
    finalResults = generateFinalProfile(userProfile, allQuestions)
  }

  // If results were provided but missing core analytics, try deriving and merging with provided results
  if(finalResults && (finalResults.overallPct == null || finalResults.interestTags == null) && userProfile){
    try{
      const derived = generateFinalProfile(userProfile, allQuestions) || {}
      // merge but prefer explicit values from finalResults when present
      finalResults = { ...derived, ...finalResults }
      // ensure interestTags at least contains user preferences if present in window state (Home merges on save, but fallback here)
      finalResults.interestTags = Array.isArray(finalResults.interestTags) ? finalResults.interestTags : []
    }catch(e){ /* ignore */ }
  }

  // If no external recommendation generator supplied, we'll use the local recommender util as a fallback
  function generateLocalRecommendations(finalResultsObj){
    try{
      const prefs = {
        level: finalResultsObj.level || finalResultsObj.finalLevel || undefined,
        topics: Array.isArray(finalResultsObj.interestTags) ? finalResultsObj.interestTags : [],
        maxHours: finalResultsObj.maxHours || finalResultsObj.max_hours || null,
        weights: finalResultsObj.recommendationWeights || undefined
      }
      if(Array.isArray(courses) && courses.length) return recommend(courses, prefs)
    }catch(e){ /* ignore */ }
    return []
  }

  // If we have a userProfile, derive fresh profile and prefer it when totals/percent disagree
  if(userProfile){
    try{
      const derived = generateFinalProfile(userProfile, allQuestions) || null
      if(derived && typeof derived === 'object'){
        const mismatch = (derived.totalAnswered && ((finalResults?.totalAnswered || 0) !== derived.totalAnswered || (finalResults?.totalCorrect || 0) !== derived.totalCorrect || (finalResults?.overallPct || 0) !== derived.overallPct))
        if(mismatch){
          // prefer derived authoritative values for dynamic analytics
          finalResults = { ...finalResults, ...derived }
        }
      }
    }catch(e){ /* ignore */ }
  }

  if(!finalResults) return <div><h2 className="text-2xl">No results found</h2><p>Please complete the assessment.</p></div>

  // normalize to old shape if necessary
  let displayLevel = finalResults.level || finalResults.finalLevel || 'Unknown'

  // derive numeric percent and clamp
  let pct = finalResults.overallPct ?? finalResults.overallScorePercentage ?? ''
  if(typeof pct === 'number'){
    pct = Math.max(0, Math.min(100, Math.round(pct)))
  }

  // ensure level maps to requested ranges if percent available
  function mapLevelFromPct(p){
    if(typeof p !== 'number') return displayLevel
    if(p >= 81) return 'Expert'
    if(p >= 61) return 'Intermediate'
    if(p >= 40) return 'Beginner'
    return 'Beginner'
  }
  if(typeof pct === 'number') displayLevel = mapLevelFromPct(pct)

  // DEV: if user answered >=2 correct answers and you requested to force beginner with 30-40% for testing,
  // apply a temporary mapping. Remove this block in production.
  if(finalResults && finalResults.totalCorrect >= 2 && false){
    displayLevel = 'Beginner'
    pct = Math.max(30, Math.min(40, pct || 35))
  }

  // totals
  const totalCorrect = finalResults.totalCorrect ?? finalResults.totalCorrect ?? 0
  const totalAnswered = finalResults.totalAnswered ?? finalResults.totalAnswered ?? 0

  // call recommendation generator and normalize output
  let recsRaw = []
  let topMatch = null
  let perLevelTop = { Beginner: null, Intermediate: null, Expert: null }
  if(typeof generateRecommendations === 'function'){
    try{
      // ensure generator sees the mapped level and pct
      const recInput = { ...finalResults, level: displayLevel, overallPct: (typeof pct === 'number' ? pct : finalResults.overallPct), overallScorePercentage: (typeof pct === 'number' ? pct : finalResults.overallScorePercentage) }
      const r = generateRecommendations(recInput)
      if(Array.isArray(r)){
        recsRaw = r
      } else if(r && typeof r === 'object'){
        topMatch = r.topMatch || null
        perLevelTop = r.perLevel || perLevelTop
        recsRaw = Array.isArray(r.recommendations) ? r.recommendations : []
      }
    }catch(e){ console.error('Failed to generate recommendations', e); recsRaw = [] }
  } else {
    // fallback: use local recommender util
    try{
      recsRaw = generateLocalRecommendations({...finalResults, level: displayLevel, overallPct: (typeof pct === 'number' ? pct : finalResults.overallPct)})
    }catch(e){ recsRaw = [] }
  }

  // If the returned recommendations do not contain any course matching the displayLevel
  // (likely because `courses` only contains beginner data), fetch all courses and recompute.
  useEffect(()=>{
    let cancelled = false
    async function ensureAllLevels(){
      try{
        const hasLevelInInput = Array.isArray(recsRaw) && recsRaw.some(c=> (String(c.level||'').toLowerCase() === String(displayLevel||'').toLowerCase()))
        if(!hasLevelInInput){
          // fetch all courses (this will load any missing files available in public)
          const all = await fetchAllCourses()
          if(cancelled) return
          setFetchedCourses(all)
          try{
            const prefs = { level: displayLevel, topics: finalResults.interestTags || [] }
            const recomputed = recommend(all, prefs)
            if(cancelled) return
            setFallbackRecsFromFetch(recomputed)
          }catch(e){ /* ignore */ }
        }
      }catch(e){ /* ignore */ }
    }
    ensureAllLevels()
    return ()=> { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayLevel, JSON.stringify(finalResults)])

  // If we fetched fallback recs, prefer those
  if (Array.isArray(fallbackRecsFromFetch) && fallbackRecsFromFetch.length) recsRaw = fallbackRecsFromFetch

  // helper: normalize level string and pick top by score
  function normalLevel(s){ if(!s) return ''; try{ return String(s).replace(/_courses$/i,'').trim() }catch(e){ return String(s||'').trim() } }
  function resolveTitle(c){ return c?.title || c?.name || c?.courseTitle || c?.heading || c?.label || 'Untitled Course' }
  function resolveThumb(c){ return c?.thumbnail || c?.image || c?.thumbnail_url || c?.cover || c?.imageUrl || '/background.jpg' }
  function safeCourseClone(c){ if(!c) return null; const clone = { ...c }; clone.title = resolveTitle(c); clone.thumbnail = resolveThumb(c); return clone }
  function pickTopCandidate(list){ if(!list || !list.length) return null; const candidates = list.filter(it=> it && (it.title || it.name || it.courseTitle || it.heading || it.analytics?.final_comparison_score != null)); if(!candidates.length) return null; const top = candidates.slice().sort((a,b)=> ((b.analytics?.final_comparison_score||0)-(a.analytics?.final_comparison_score||0)) || ((b.normalized_rating||0)-(a.normalized_rating||0)) )[0]; return safeCourseClone(top) }

  // If topMatch doesn't match the computed displayLevel, attempt to find a replacement from courses
  try{
    if(topMatch){
      const tmLevel = normalLevel(topMatch.level).toLowerCase()
      if(tmLevel !== String(displayLevel).toLowerCase()){
        const candidates = (Array.isArray(courses)?courses:[]).filter(c=> {
          const lev = normalLevel(c.level).toLowerCase()
          const tags = Array.isArray(c.analytics?.filter_tags) ? c.analytics.filter_tags.map(t=> String(t).toLowerCase()) : []
          return lev === String(displayLevel).toLowerCase() || tags.includes(String(displayLevel).toLowerCase())
        })
        const repl = pickTopCandidate(candidates)
        if(repl) topMatch = repl
      } else {
        // ensure provided topMatch has thumbnail/title
        topMatch = safeCourseClone(topMatch)
      }
    } else {
      // no topMatch provided: try to find one for displayLevel
      const candidates = (Array.isArray(courses)?courses:[]).filter(c=> normalLevel(c.level).toLowerCase() === String(displayLevel).toLowerCase() || (Array.isArray(c.analytics?.filter_tags) && c.analytics.filter_tags.map(t=> String(t).toLowerCase()).includes(String(displayLevel).toLowerCase())))
      topMatch = pickTopCandidate(candidates)
    }

    // ensure perLevelTop entries are populated with true matches if missing
    ['Beginner','Intermediate','Expert'].forEach(lv => {
      if(!perLevelTop || !perLevelTop[lv]){
        const candidates = (Array.isArray(courses)?courses:[]).filter(c=> normalLevel(c.level).toLowerCase() === String(lv).toLowerCase() || (Array.isArray(c.analytics?.filter_tags) && c.analytics.filter_tags.map(t=> String(t).toLowerCase()).includes(String(lv).toLowerCase())))
        let picked = pickTopCandidate(candidates)
        if(!picked && candidates && candidates.length){
          // fallback to first matching candidate if scoring not present
          picked = safeCourseClone(candidates[0])
        }
        // try tag-based search across all courses if still empty
        if(!picked){
          const tagMatches = (Array.isArray(courses)?courses:[]).filter(c=> Array.isArray(c.analytics?.filter_tags) && c.analytics.filter_tags.map(t=> String(t).toLowerCase()).includes(String(lv).toLowerCase()))
          picked = pickTopCandidate(tagMatches) || (tagMatches.length? safeCourseClone(tagMatches[0]) : null)
        }
        // final fallback: pick top overall course so UI never shows empty
        if(!picked){
          const topOverall = pickTopCandidate(Array.isArray(courses)?courses:[])
          picked = topOverall || (Array.isArray(courses) && courses.length ? safeCourseClone(courses[0]) : null)
        }
        perLevelTop[lv] = picked
      } else {
        // sanitize existing perLevelTop entry
        perLevelTop[lv] = safeCourseClone(perLevelTop[lv])
      }
    })
  }catch(e){ /* ignore */ }

  const fallbackRecs = Array.isArray(courses) ? courses.slice(0,3).map(safeCourseClone) : []
  
  // Goal: select up to 3 courses, ideally one from each level (Beginner, Intermediate, Expert).
  let recommendations = []
  if (Array.isArray(recsRaw) && recsRaw.length){
    const levels = ['Beginner','Intermediate','Expert']
    const chosen = new Set()
    // prefer courses that match user preference tags first
    const userTopics = (finalResults.interestTags||[]).map(t=>String(t).toLowerCase())

    for(const lv of levels){
      // gather candidates that claim the level or have level tag
      let candidates = recsRaw.filter(c => {
        try{
          const lev = normalLevel(c.level).toLowerCase()
          if (lev === lv.toLowerCase()) return true
          const tags = Array.isArray(c.analytics?.filter_tags) ? c.analytics.filter_tags.map(t=> String(t).toLowerCase()) : []
          if (tags.includes(lv.toLowerCase())) return true
          return false
        }catch(e){ return false }
      })

      // if no direct candidates, allow any course but prefer by score
      if (!candidates.length) candidates = recsRaw.slice()

      // score candidates by whether they match user topics and by _score
      candidates = candidates
        .filter(c => c) // remove falsy
        .map(c => ({
          c,
          topicMatch: Array.isArray(c._tags) ? c._tags.some(t=> t.match) : (Array.isArray(c.analytics?.filter_tags) && c.analytics.filter_tags.some(t=> userTopics.includes(String(t).toLowerCase()))),
          score: (c._score != null ? c._score : (c.analytics?.final_comparison_score ? (c.analytics.final_comparison_score/100) : 0))
        }))
        .sort((a,b) => (b.topicMatch - a.topicMatch) || (b.score - a.score))

      const pick = candidates.find(x => x && x.c && !chosen.has(x.c.title || x.c.name || x.c.courseTitle))
      if (pick && pick.c){
        recommendations.push(safeCourseClone(pick.c))
        chosen.add(pick.c.title || pick.c.name || pick.c.courseTitle)
      }
      if (recommendations.length >= 3) break
    }

    // fill remaining slots with top scored unique courses
    if (recommendations.length < 3){
      const additional = recsRaw.slice().sort((a,b)=> (b._score||0)-(a._score||0)).filter(c=> c && !chosen.has(c.title || c.name || c.courseTitle)).slice(0, 3 - recommendations.length)
      additional.forEach(c=> recommendations.push(safeCourseClone(c)))
    }

    // final safety: trim to 3
    recommendations = recommendations.slice(0,3)
  } else {
    recommendations = fallbackRecs
  }
 
   // ensure recommendations is an array before mapping
   const safeRecommendations = Array.isArray(recommendations) ? recommendations : fallbackRecs

  // render list of personalized recommendations as a 3-column grid
  const recommendationGrid = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {safeRecommendations.length ? safeRecommendations.map((c, idx) => (
        <div key={idx} className="w-full">
          <RecommendationCard course={c} userPrefs={{ level: displayLevel, topics: finalResults.interestTags || [] }} />
        </div>
      )) : <div className="text-sm text-gray-500">No personalized recommendations available.</div>}
    </div>
  )

  // derive interest/weakness/overall
  const interest = Array.isArray(finalResults.interestTags) ? finalResults.interestTags : []
  const weakness = Array.isArray(finalResults.weaknessTags) ? finalResults.weaknessTags : []
  const overallPct = (typeof pct === 'number') ? pct : ''

  return (
    <div className="bg-white p-6 rounded-lg">
      <h2 className="text-3xl font-extrabold text-center text-green-600 mb-4">Step 6: Your Personalized Course Path</h2>
      <p className="text-center mb-6">You have been assigned the <strong className="text-blue-600">{displayLevel}</strong> level. This determination and the course recommendations are adaptive — computed from your assessment answers and domain/profile insights.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-600 text-white rounded">Overall Level: <div className="text-2xl font-bold">{displayLevel}</div></div>
        <div className="p-4 bg-purple-600 text-white rounded">Profile Summary: <div className="text-2xl font-bold">{overallPct !== '' ? overallPct + '%' : 'N/A'}</div></div>
        <div className="p-4 bg-yellow-400 text-black rounded">Key Focus: <div className="text-2xl font-bold">{(interest.length? interest.slice(0,2) : weakness.slice(0,2)).join(', ') || '—'}</div></div>
      </div>

      {/* totals and progress bar */}
      <div className="mb-6 p-4 border rounded">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm">Answered: <strong>{totalAnswered}</strong></div>
          <div className="text-sm">Correct: <strong>{totalCorrect}</strong></div>
          <div className="text-sm">Accuracy: <strong>{(totalAnswered>0)? Math.round((totalCorrect/totalAnswered)*100) + '%':'N/A'}</strong></div>
        </div>
        <div className="w-full bg-gray-200 h-3 rounded overflow-hidden">
          <div style={{ width: (overallPct !== '' ? overallPct : 0) + '%' }} className="h-3 bg-green-500" />
        </div>
      </div>

      {/* small insights panel */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded">
          <h4 className="font-semibold mb-2">Insights</h4>
          <div className="text-sm">Overall score: <strong>{overallPct !== '' ? overallPct + '%' : 'N/A'}</strong></div>
          <div className="text-sm mt-2">Interest tags: <strong>{interest.length? interest.join(', '): '—'}</strong></div>
          <div className="text-sm mt-2">Weakness tags: <strong>{weakness.length? weakness.join(', '): '—'}</strong></div>
        </div>
        <div className="p-4 border rounded">
          <h4 className="font-semibold mb-2">How recommendations are chosen</h4>
          <p className="text-sm">We prioritize courses that match your assessed level and the topics identified by the assessment (weaknesses or interests). If no strong match is found, we fall back to popular courses for your level.</p>
        </div>
        <div className="p-4 border rounded">
          <h4 className="font-semibold mb-2">Next steps</h4>
          <p className="text-sm">You can enroll in the suggested courses below or open the Explorer to see the full catalogue filtered by these topics.</p>
        </div>
      </div>

       {/* if domain analysis data exists keep it */}
       {finalResults.domainMax && Object.keys(finalResults.domainMax||{}).length > 0 && (
         <DomainAnalysis domainScores={Object.keys(finalResults.domainMax||{}).map(k=> ({ domain:k, score: finalResults.domainPerformance[k]||0, max: finalResults.domainMax[k]||1 }))} />
       )}

       <div className="mb-6">
         <h3 className="text-2xl font-bold mb-4">Personalized Course Recommendations</h3>
         {recommendationGrid}
       </div>
     </div>
   )
 }
