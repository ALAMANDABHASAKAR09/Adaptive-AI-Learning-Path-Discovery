import React, { useEffect, useState } from 'react'
import { selectNextQuestion, updateProfile, scoreWrittenAnswer, generateFinalProfile } from '../../utils/assessmentLogic'

export default function Step5_AdaptiveAssessment({ userProfile, setUserProfile, questionPool, allTags = [], allQuestions = [], onComplete }){
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [currentAnswer, setCurrentAnswer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [warning, setWarning] = useState('')
  const totalQuestions = 7

  // track how many of each question TYPE we've asked (local state)
  const [answeredCounts, setAnsweredCounts] = useState({})
  const [questionHistory, setQuestionHistory] = useState([]) // stack of previous question objects
  const [answersMap, setAnswersMap] = useState({}) // qid -> answer

  // initialize answeredCounts from userProfile.questionsAsked if present
  useEffect(()=>{
    if(!allQuestions || !userProfile) return
    const asked = userProfile.questionsAsked || []
    const counts = {}
    Array.from(asked).forEach(qid => {
      const q = allQuestions.find(x=> x.id === qid || x.id === String(qid))
      if(q){ counts[q.type] = (counts[q.type]||0) + 1 }
    })
    setAnsweredCounts(counts)
  }, [userProfile, allQuestions])

  // helper: quotas for types (2+2+2+1 -> total 7)
  const TYPE_QUOTAS = { 'MCQ': 2, 'MCMS': 2, 'MCQ-Reorder': 2, 'ShortAnswer': 1 }

  // helper to check if a type still needs more questions
  function typeNeedsMore(type){
    const have = answeredCounts[type] || 0
    const want = TYPE_QUOTAS[type] || 0
    return have < want
  }

  // helper to find candidate by preferred types without mutating questionPool
  function findCandidateByTypes(preferredTypes = [], profile = userProfile){
    // iterate tags and difficulty similar to selectNextQuestion but do not pop
    const tried = new Set()
    const askedArr = Array.isArray(profile?.questionsAsked) ? profile.questionsAsked : (profile?.questionsAsked instanceof Set ? Array.from(profile.questionsAsked) : [])
    for(const t of allTags){
      if(!t) continue
      const buckets = questionPool[t] || {}
      const targetDifficulty = Math.max(1, Math.min(10, Number(profile?.tagLevels?.[t] || 5)))
      // search outward from targetDifficulty
      const diffs = [0]
      for(let o=1;o<=9;o++){ diffs.push(o); diffs.push(-o) }
      for(const dOff of diffs){
        const d = targetDifficulty + dOff
        if(d < 1 || d > 10) continue
        const bucket = Array.isArray(buckets[d]) ? buckets[d] : []
        for(const q of bucket){
          if(!q) continue
          if(tried.has(q.id)) continue
          tried.add(q.id)
          if(askedArr.includes(q.id)) continue
          if(preferredTypes.includes(q.type) || (preferredTypes.includes('ShortAnswer') && (q.type === 'ShortAnswer' || q.type === 'LongAnswer'))){
            return q
          }
        }
      }
    }
    return null
  }

  // helper to pick the next question honoring quotas; returns question or null
  function pickNextForQuotas(profile = userProfile){
    // build list of types that still need more
    const remainingTypes = Object.keys(TYPE_QUOTAS).filter(t => typeNeedsMore(t))
    if(remainingTypes.length === 0) return null
    // prefer fixed order: MCQ -> MCMS -> MCQ-Reorder -> ShortAnswer
    const order = ['MCQ','MCMS','MCQ-Reorder','ShortAnswer']
    const preferred = order.filter(o=> remainingTypes.includes(o))
    // try each preferred type in order
    for(const pt of preferred){
      const candidate = findCandidateByTypes([pt], profile)
      if(candidate) return candidate
      // also try similar MCQ variants for 'MCQ' group if none found
      if(pt === 'MCQ'){
        const alt = findCandidateByTypes(['MCQ-Matching','MCQ-Scenario','MCQ'], profile)
        if(alt) return alt
      }
    }
    return null
  }

  // helper to initialize first question
  useEffect(()=>{
    if(!userProfile || !questionPool || completed) return
    if(userProfile.isComplete) return

    if(!currentQuestion){
      // try quota-aware pick first
      const first = pickNextForQuotas(userProfile)
      if(first){
        setCurrentQuestion(first)
        setCurrentAnswer(answersMap[first.id] || null)
        return
      }

      const { question, updatedTagsToTest } = selectNextQuestion(userProfile, questionPool, allTags)
      if(!question){
        const finalProfile = generateFinalProfile(userProfile, allQuestions)
        console.debug('Step5 init: no question available, derived finalProfile=', finalProfile, 'userProfile=', userProfile)
        setUserProfile(up=> ({ ...(up||{}), isComplete: true }))
        setCompleted(true)
        if(typeof onComplete === 'function') onComplete(finalProfile)
        return
      }
      setCurrentQuestion(question)
      setUserProfile(up => ({ ...(up||{}), tagsToTest: updatedTagsToTest }))
      setCurrentAnswer(answersMap[question.id] || null)
    }
  }, [userProfile, questionPool, currentQuestion, allTags, setUserProfile, allQuestions, onComplete, completed])

  if(!userProfile || !questionPool) return <div>Loading assessment...</div>

  function renderOptions(q){
    if(!q) return null
    if(['MCQ','MCQ-Matching','MCQ-Reorder','MCQ-Scenario'].includes(q.type)){
      return (q.options || []).map(opt => (
        <label key={opt} className="block my-2">
          <input type="radio" name={q.id} checked={currentAnswer === opt} onChange={()=> setCurrentAnswer(opt)} /> <span className="ml-2">{opt}</span>
        </label>
      ))
    }
    if(q.type === 'MCMS'){
      const sel = Array.isArray(currentAnswer) ? currentAnswer : []
      function toggleOpt(o){
        const s = new Set(sel)
        if(s.has(o)) s.delete(o)
        else s.add(o)
        setCurrentAnswer(Array.from(s))
      }
      return (q.options || []).map(opt => (
        <label key={opt} className="block my-2">
          <input type="checkbox" name={q.id} checked={sel.includes(opt)} onChange={()=> toggleOpt(opt)} /> <span className="ml-2">{opt}</span>
        </label>
      ))
    }
    if(q.type === 'ShortAnswer' || q.type === 'LongAnswer'){
      return (
        <div>
          <textarea value={currentAnswer||''} onChange={e=> setCurrentAnswer(e.target.value)} rows={4} className="w-full p-2 border rounded" />
          {q.helpText && <p className="text-sm text-gray-500 mt-2">{q.helpText}</p>}
        </div>
      )
    }
    if(q.tag === 'Profiler'){
      if((q.options||[]).length > 1){
        return (q.options || []).map(opt => (
          <label key={opt} className="block my-2">
            <input type="radio" name={q.id} checked={currentAnswer === opt} onChange={()=> setCurrentAnswer(opt)} /> <span className="ml-2">{opt}</span>
          </label>
        ))
      }
    }
    return null
  }

  // guard: require answer before proceeding
  function hasAnswerForCurrent(){
    if(!currentQuestion) return false
    const t = currentQuestion.type
    if(['MCQ','MCQ-Matching','MCQ-Reorder','MCQ-Scenario'].includes(t)) return !!currentAnswer
    if(t === 'MCMS') return Array.isArray(currentAnswer) && currentAnswer.length>0
    if(t === 'ShortAnswer' || t === 'LongAnswer'){
      const wc = (currentAnswer||'').split(/\s+/).filter(Boolean).length
      return wc >= (currentQuestion.minLength || 0)
    }
    // profiler or unknown: accept any non-empty
    return !!currentAnswer
  }

  async function handleNext(){
    if(completed || loading) return
    if(!currentQuestion) return
    if(!hasAnswerForCurrent()){
      setWarning('Please answer the question before proceeding.')
      setTimeout(()=> setWarning(''), 2500)
      return
    }

    setLoading(true)
    setWarning('')
    const q = currentQuestion
    let isCorrect = false
    let writtenScores = null

    if(['MCQ','MCQ-Matching','MCQ-Reorder','MCQ-Scenario'].includes(q.type)){
      isCorrect = currentAnswer === q.correctAnswer
    } else if(q.type === 'MCMS'){
      const expected = Array.isArray(q.correctAnswers) ? q.correctAnswers.slice().sort() : []
      const got = Array.isArray(currentAnswer) ? currentAnswer.slice().sort() : []
      isCorrect = JSON.stringify(expected) === JSON.stringify(got)
    } else if(q.type === 'ShortAnswer' || q.type === 'LongAnswer'){
      writtenScores = scoreWrittenAnswer(currentAnswer || '', q.scoringTags || {}, q.minLength || 0)
      isCorrect = Object.values(writtenScores.tagScores || {}).some(s => s >= 0.7)
    } else if(q.tag === 'Profiler'){
      isCorrect = true
    }

    // build updated profile
    const updated = updateProfile(userProfile, q, currentAnswer, isCorrect, writtenScores)

    // persist current answer in local map
    setAnswersMap(prev => ({ ...(prev||{}), [q.id]: currentAnswer }))

    // update local answeredCounts for quotas
    setAnsweredCounts(prev => {
      const next = { ...(prev||{}) }
      next[q.type] = (next[q.type]||0) + 1
      return next
    })

    // determine next question respecting quotas
    let nextQ = pickNextForQuotas(updated)
    if(!nextQ){
      // fallback to adaptive selector
      const { question: selQ, updatedTagsToTest } = selectNextQuestion(updated, questionPool, allTags)
      nextQ = selQ
      updated.tagsToTest = updatedTagsToTest
    }

    // before navigating forward, push current question onto history so Previous can work
    setQuestionHistory(h => {
      const next = Array.isArray(h) ? [...h] : []
      next.push(q)
      return next
    })

    // finalize check
    const answered = updated.currentQuestionIndex || 0
    const profilerQs = allQuestions.filter(x=> x.tag === 'Profiler').map(p=> p.id)
    const beginnerPivotDone = updated.isBeginnerPivot && profilerQs.length>0 && profilerQs.every(pq => updated.questionsAsked.has(pq))

    if(answered >= totalQuestions || beginnerPivotDone || !nextQ){
      const finalProfile = generateFinalProfile(updated, allQuestions)
      updated.tagsToTest = updated.tagsToTest || []
      console.debug('Step5 complete: finalProfile=', finalProfile, 'updatedProfile=', updated)
      setUserProfile(updated)
      setCompleted(true)
      setLoading(false)
      setUserProfile(up=> ({ ...(up||{}), isComplete: true }))
      if(typeof onComplete === 'function') onComplete(finalProfile)
      return
    }

    // otherwise continue
    setUserProfile(updated)
    setCurrentQuestion(nextQ)
    setCurrentAnswer(answersMap[nextQ?.id] || null)
    setLoading(false)
  }

  function handlePrev(){
    if(loading) return
    if(!questionHistory || questionHistory.length === 0) return
    const h = [...questionHistory]
    const prevQ = h.pop()
    setQuestionHistory(h)
    setCurrentQuestion(prevQ)
    setCurrentAnswer(answersMap[prevQ.id] || null)
  }

  // compute current correct count from tagScores in userProfile
  function getCorrectCount(){
    try{
      const ts = userProfile && userProfile.tagScores ? userProfile.tagScores : {}
      return Object.values(ts).reduce((s, t) => s + (t.correct || 0), 0)
    }catch(e){ return 0 }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Step 5: Adaptive Knowledge Assessment</h2>
      <p className="text-gray-600 mb-4">This assessment adapts to your performance. Answer {totalQuestions} questions or finish profiler flow if identified as a beginner.</p>

      {completed ? (
        <div className="p-4 border rounded bg-green-50 text-green-800 mb-4">
          Assessment complete — saving your results and moving to the Results screen.
        </div>
      ) : null}

      <div className="p-4 border rounded mb-4 bg-white">
        <div className="text-sm text-gray-500 mb-1">Question { Math.min((userProfile.currentQuestionIndex || 0) + 1, totalQuestions) } / {totalQuestions} • Correct: {getCorrectCount()}</div>
        {currentQuestion ? (
          <div>
            <div className="font-semibold mb-2">{currentQuestion.text}</div>
            <div className="mb-4">{renderOptions(currentQuestion)}</div>
            {warning && <div className="mb-2 text-sm text-red-600">{warning}</div>}
            <div className="flex justify-center space-x-4">
              <button onClick={handlePrev} disabled={loading || !questionHistory.length} className="px-4 py-2 bg-gray-300 text-black rounded">Previous</button>
              <button onClick={handleNext} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{((userProfile.currentQuestionIndex||0) + 1) >= totalQuestions ? 'Submit' : 'Next'}</button>
            </div>
          </div>
        ) : (
          <div>No question available — the bank may be exhausted for selected tags.</div>
        )}
      </div>
    </div>
  )
}
