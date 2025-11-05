import React, { useState } from 'react'
import Question from './Assessment/Question'

function arraysEqualAsSets(a, b){
  if(!Array.isArray(a) || !Array.isArray(b)) return false
  if(a.length !== b.length) return false
  const sa = new Set(a)
  const sb = new Set(b)
  if(sa.size !== sb.size) return false
  for(const v of sa) if(!sb.has(v)) return false
  return true
}

export default function Step5_Assessment({ stagedQuestions, answers, onAnswer, subStep, setSubStep, onSubmit, results }){
  const [errorMessage, setErrorMessage] = useState('')

  function isStageComplete(stage){
    const questions = stagedQuestions[stage]||[]
    return questions.every(q=> {
      const a = answers[q.id]
      if(q.type === 'MCQ' || q.type === 'MCQ-Matching' || q.type === 'MCQ-Reorder' || q.type === 'MCQ-Scenario') return !!a
      if(q.type === 'MCMS'){
        // for completion require at least one selected; prefer exact match for validation if correctAnswers present
        if(Array.isArray(q.correctAnswers) && q.correctAnswers.length) return arraysEqualAsSets(a || [], q.correctAnswers)
        return Array.isArray(a) && a.length>0
      }
      const words = (a||'').split(/\s+/).filter(Boolean).length
      return words >= (q.minLength||0)
    })
  }

  // helper to list which questions are incomplete for a stage
  function incompleteQuestions(stage){
    const questions = stagedQuestions[stage]||[]
    return questions.filter(q=>{
      const a = answers[q.id]
      if(q.type === 'MCQ' || q.type === 'MCQ-Matching' || q.type === 'MCQ-Reorder' || q.type === 'MCQ-Scenario') return !a
      if(q.type === 'MCMS'){
        if(Array.isArray(q.correctAnswers) && q.correctAnswers.length) return !arraysEqualAsSets(a || [], q.correctAnswers)
        return !(Array.isArray(a) && a.length>0)
      }
      const words = (a||'').split(/\s+/).filter(Boolean).length
      return words < (q.minLength||0)
    }).map(q=> q.id + ': ' + (q.type==='MCQ' ? 'answer required' : `min ${q.minLength||0} words`))
  }

  // Debug-enabled Next handler
  function handleNext(){
    console.debug('Attempting next from subStep=', subStep)
    console.debug('Concepts complete?', isStageComplete('Concepts'))
    console.debug('Answers snapshot:', Object.keys(answers).length)

    setErrorMessage('')

    if(subStep==='Basics' && isStageComplete('Basics')) {
      setSubStep('Concepts')
      return
    }
    if(subStep==='Concepts' && isStageComplete('Concepts')) {
      setSubStep('Depth')
      return
    }

    // Not complete — compute missing and show message
    const missing = incompleteQuestions(subStep)
    if(missing.length){
      const msg = `Cannot advance — ${missing.length} question(s) incomplete. First few: ${missing.slice(0,3).join('; ')}`
      console.warn(msg)
      setErrorMessage(msg)
      // attempt to focus first unanswered input by id if present
      try{
        const firstUnanswered = (stagedQuestions[subStep]||[]).find(q=> {
          const a = answers[q.id]
          if(q.type==='MCQ') return !a
          const words = (a||'').split(/\s+/).filter(Boolean).length
          return words < (q.minLength||0)
        })
        if(firstUnanswered){
          const el = document.querySelector(`[name="${firstUnanswered.id}"]`)
          if(el && typeof el.focus === 'function') el.focus()
        }
      }catch(e){}
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Step 5: Adaptive Knowledge Assessment</h2>
      <p className="text-gray-600 mb-4">Complete all three stages. Answers save automatically. Submit final stage to be scored.</p>
      <div className="flex justify-around border-b mb-6">
        {['Basics','Concepts','Depth'].map(s=> (
          <div key={s} className={`pb-2 px-4 ${subStep===s? 'font-semibold border-b-4 border-yellow-400':''} ${isStageComplete(s)? 'text-green-600':''}`} onClick={()=> setSubStep(s)} style={{cursor:'pointer'}}>{s}</div>
        ))}
      </div>

      {errorMessage && <div className="mb-4 p-3 bg-yellow-100 text-yellow-900 rounded">{errorMessage}</div>}

      {results ? (
        <div className="p-6 bg-green-100 text-green-800 rounded">Assessment Complete! Score: {results.overallScorePercentage}% — Level: {results.level}</div>
      ) : (
        <div>
          {stagedQuestions[subStep].map(q=> (
            <Question key={q.id} q={q} value={answers[q.id]} onChange={onAnswer} />
          ))}

          <div className="flex justify-between mt-4">
            <button onClick={()=> {
              if(subStep==='Concepts') setSubStep('Basics')
              else if(subStep==='Depth') setSubStep('Concepts')
            }} className="px-4 py-2 bg-gray-200 rounded">← Previous Stage</button>

            {subStep !== 'Depth' ? (
              <button onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded">Next Stage →</button>
            ) : (
              <button onClick={onSubmit} className="px-4 py-2 bg-green-600 text-white rounded">Submit and Score Assessment</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
