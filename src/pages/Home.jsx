import React, { useEffect, useState } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'
import { fetchAllCourses } from '../utils/api'
import StepIndicator from '../components/StepIndicator'
import Step1_Field from '../components/Wizard/Step1_Field'
import Step2_Level from '../components/Wizard/Step2_Level'
import Step3_Topic from '../components/Wizard/Step3_Topic'
import Step4_Duration from '../components/Wizard/Step4_Duration'
// remove old staged assessment import
// import Step5_Assessment from '../components/Wizard/Step5_Assessment'
import Step5_AdaptiveAssessment from '../components/Wizard/Step5_AdaptiveAssessment'
import Step6_Results from '../components/Wizard/Step6_Results'
import Explorer from '../components/Explorer/Explorer'

import {
  preprocessQuestionBank,
  selectNextQuestion,
  updateProfile,
  generateFinalProfile,
  scoreWrittenAnswer,
  generateRecommendations as generateRecommendationsFromLogic
} from '../utils/assessmentLogic'

const STEP_NAMES = ['Field','Level','Topic','Duration','Assessment','Results','Explorer']

// central initial state so reset can restore a fresh start
const INITIAL_STATE = {
  currentStep: 1,
  maxStep: 1,
  assessmentSubStep: 'Basics',
  selections: { field:null, level:null, topic:[], duration:[], assessmentAnswers:{}, assessmentResults:null,
    // new preference fields collected in Steps 1-4
    outcome: null,
    format: [],
    tools: [],
    maxHours: null
  }
}

export default function Home(){
  const [courses, setCourses] = useState([])
  const [appState, setAppState] = useLocalStorage('wizard-state', INITIAL_STATE)

  // NEW: adaptive assessment state
  const [questionPool, setQuestionPool] = useState(null)
  const [allQuestions, setAllQuestions] = useState([])
  const [allTags, setAllTags] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [loadingQuestions, setLoadingQuestions] = useState(false)

  // restore adaptive profile from localStorage if present
  useEffect(()=>{
    try{
      const raw = localStorage.getItem('adaptive-user-profile')
      if(raw){
        const parsed = JSON.parse(raw)
        parsed.questionsAsked = new Set(Array.isArray(parsed.questionsAsked) ? parsed.questionsAsked : [])
        setUserProfile(parsed)
      }
    }catch(e){}
  }, [])

  // helper to persist profile (store questionsAsked as array)
  function persistUserProfile(profile){
    try{
      const copy = { ...profile }
      copy.questionsAsked = (profile && profile.questionsAsked instanceof Set) ? Array.from(profile.questionsAsked) : Array.isArray(profile?.questionsAsked) ? profile.questionsAsked : []
      localStorage.setItem('adaptive-user-profile', JSON.stringify(copy))
    }catch(e){}
  }

  // wrapper to set profile and persist; accepts function updater or object
  function setAndPersistUserProfile(updater){
    if(typeof updater === 'function'){
      setUserProfile(prev => {
        const next = updater(prev)
        persistUserProfile(next)
        return next
      })
    } else {
      setUserProfile(updater)
      persistUserProfile(updater)
    }
  }

  useEffect(()=>{ // load courses
    fetchAllCourses().then(data=> setCourses(data)).catch(()=>{})
  },[])

  useEffect(()=>{
    // persist
  }, [appState])

  // Load question bank when user reaches step 5 for the first time
  useEffect(()=>{
    if(appState.currentStep === 5 && !questionPool && !loadingQuestions){
      setLoadingQuestions(true)
      // fetch split files (mcq, mcms, profiler) and combine
      Promise.all([
        fetch('/mcq_questions.json').then(r=> r.ok ? r.json() : []),
        fetch('/mcms_questions.json').then(r=> r.ok ? r.json() : []),
        fetch('/profiler_questions.json').then(r=> r.ok ? r.json() : [])
      ]).then(([mcqData, mcmsData, profilerData])=>{
        const mcqTypes = ['MCQ','MCQ-Matching','MCQ-Reorder','MCQ-Scenario','MCQ-Matching']
        const mcqQuestions = (mcqData || []).filter(q => mcqTypes.includes(q.type))
        const mcmsQuestions = (mcmsData || []).filter(q => q.type === 'MCMS')
        const profilerQuestions = (profilerData || []).filter(q => q.tag === 'Profiler')

        // combined allowed set: MCQ-like + MCMS + Profiler (exclude Short/Long/ShortAnswer/LongAnswer)
        const filteredTech = [...mcqQuestions, ...mcmsQuestions]
        const combined = filteredTech.concat(profilerQuestions)

        setAllQuestions(combined)

        // preprocess using filtered set
        const pool = preprocessQuestionBank(combined)
        setQuestionPool(pool)

        const tags = Array.from(new Set((filteredTech||[]).map(q=> q.tag).filter(t=> t && t !== 'Profiler')))
        setAllTags(tags)
        // initialize userProfile with tagLevels default 5
        const tagLevels = {}
        tags.forEach(t=> tagLevels[t] = 5)
        setAndPersistUserProfile({
          isActive: true,
          isComplete: false,
          currentQuestionIndex: 0,
          questionsAsked: new Set(),
          tagsToTest: [],
          tagLevels,
          tagScores: {},
          isBeginnerPivot: false,
          profilerAnswers: {},
          firstFourHistory: []
        })
      }).catch(e=>{
        console.error('Failed to load split question banks', e)
      }).finally(()=> setLoadingQuestions(false))
    }
  }, [appState.currentStep, questionPool, loadingQuestions])

  function updateNavigation(){
    // keep maxStep updated
    let { currentStep, maxStep, selections } = appState
    let enableNext = false
    switch(currentStep){
      case 1: enableNext = !!selections.field; break
      case 2: enableNext = !!selections.level; break
      case 3: enableNext = selections.topic.length>0; break
      case 4: enableNext = selections.duration.length>0; break
      case 5: enableNext = !!selections.assessmentResults || (userProfile && userProfile.isComplete); break
      case 6: enableNext = true; break
      default: enableNext = false
    }
    if(enableNext && currentStep >= maxStep){
      setAppState(s=> ({ ...s, maxStep: currentStep+1 }))
    }
  }

  useEffect(()=>{ updateNavigation() }, [appState, userProfile])

  function goToStep(step){ if(step <= appState.maxStep) setAppState(s=> ({ ...s, currentStep: step })) }
  function nextStep(){ setAppState(s=> ({ ...s, currentStep: Math.min(STEP_NAMES.length, s.currentStep+1) })) }
  function prevStep(){ setAppState(s=> ({ ...s, currentStep: Math.max(1, s.currentStep-1) })) }

  function setSelection(key, value){ setAppState(s=> ({ ...s, selections: { ...s.selections, [key]: value } })) }

  function handleAssessmentChange(qId, value){
    setAppState(s=> ({ ...s, selections: { ...s.selections, assessmentAnswers: { ...s.selections.assessmentAnswers, [qId]: value }, assessmentResults: null } }))
  }

  function submitAssessment(){
    // legacy submit kept for backwards compatibility
  }

  // when adaptive assessment completes, store results into persistent app state
  function handleAdaptiveComplete(finalProfile){
    // ensure we have a usable finalProfile; if not, derive from persisted userProfile
    let fp = finalProfile
    if(!fp && userProfile){
      try{
        fp = generateFinalProfile(userProfile, allQuestions)
        console.debug('Derived finalProfile from userProfile', fp)
      }catch(e){ console.error('Failed to derive finalProfile', e) }
    }

    if(!fp){
      console.warn('handleAdaptiveComplete called without finalProfile and no userProfile available')
      return
    }

    // Merge user-selected topics/field as interestTags fallback/augmentation
    try{
      const prefTopics = Array.isArray(appState.selections?.topic) ? appState.selections.topic : []
      const prefField = appState.selections?.field ? [appState.selections.field] : []
      const prefs = [...prefTopics, ...prefField].filter(Boolean)
      if(prefs.length){
        fp.interestTags = Array.from(new Set([...(fp.interestTags||[]), ...prefs]))
      } else {
        fp.interestTags = fp.interestTags || []
      }
    }catch(e){ /* ignore */ }

    // Ensure numeric analytics exist (merge from derived profile if missing)
    try{
      const derived = (userProfile && generateFinalProfile(userProfile, allQuestions)) || {}
      fp.overallPct = (fp.overallPct != null) ? fp.overallPct : (derived.overallPct != null ? derived.overallPct : (derived.overallScorePercentage != null ? derived.overallScorePercentage : 0))
      fp.overallScorePercentage = (fp.overallScorePercentage != null) ? fp.overallScorePercentage : (derived.overallScorePercentage != null ? derived.overallScorePercentage : fp.overallPct)
      fp.weaknessTags = Array.isArray(fp.weaknessTags) ? fp.weaknessTags : (Array.isArray(derived.weaknessTags) ? derived.weaknessTags : [])
      fp.tagProfile = fp.tagProfile || derived.tagProfile || {}
      fp.levelTagGroups = fp.levelTagGroups || derived.levelTagGroups || { beginner: [], intermediate: [], expert: [] }
      fp.interestTags = Array.isArray(fp.interestTags) ? fp.interestTags : (Array.isArray(derived.interestTags) ? derived.interestTags : [])
    }catch(e){ /* ignore */ }

    // store results and advance to Results step immediately
    setAppState(s=> ({ ...s, selections: { ...s.selections, assessmentResults: fp }, currentStep: 6, maxStep: Math.max(s.maxStep, 6) }))
    // mark profile complete in persisted adaptive profile
    setAndPersistUserProfile(up => ({ ...(up||{}), isComplete: true }))
    console.debug('Adaptive complete, saved profile and results', fp)
  }

  // Render current step
  const { currentStep } = appState

  function toggleTheme(){ document.documentElement.classList.toggle('dark') }

  // reset button: remove persisted state and reload so app starts fresh
  function resetWizard(){
    try { localStorage.removeItem('wizard-state') } catch(e){}
    try { localStorage.removeItem('adaptive-user-profile') } catch(e){}
    try { document.documentElement.classList.remove('dark') } catch(e){}
    window.location.reload()
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-6xl mx-auto"> 
        <h1 className="text-3xl font-extrabold mb-6 text-center">Adaptive AI Learning Path Discovery</h1>

        <div className="text-center mb-6 flex items-center justify-center space-x-4">
          <div role="button" onClick={toggleTheme} className="theme-toggle mx-auto inline-flex">
            <div className="switch relative"><div className="knob" /></div>
          </div>
          <button onClick={resetWizard} className="ml-2 px-4 py-2 rounded-full bg-red-500 text-white">Reset</button>
        </div>

        <StepIndicator stepNames={STEP_NAMES} currentStep={currentStep} maxStep={appState.maxStep} goToStep={goToStep} />

        {currentStep !== 7 ? (
          <div className="container-card p-6 mt-6">
            {currentStep === 1 && <Step1_Field value={appState.selections.field} onChange={v=> setSelection('field', v)} selections={appState.selections} setSelectionProp={(k,v)=> setSelection(k,v)} />}
            {currentStep === 2 && <Step2_Level value={appState.selections.level} onChange={v=> setSelection('level', v)} selections={appState.selections} setSelectionProp={(k,v)=> setSelection(k,v)} />}
            {currentStep === 3 && <Step3_Topic value={appState.selections.topic} onChange={v=> setSelection('topic', v)} selections={appState.selections} setSelectionProp={(k,v)=> setSelection(k,v)} />}
            {currentStep === 4 && <Step4_Duration value={appState.selections.duration} onChange={v=> setSelection('duration', v)} selections={appState.selections} setSelectionProp={(k,v)=> setSelection(k,v)} />}

            {currentStep === 5 && (
              <Step5_AdaptiveAssessment
                userProfile={userProfile}
                setUserProfile={setAndPersistUserProfile}
                questionPool={questionPool}
                allTags={allTags}
                allQuestions={allQuestions}
                onComplete={handleAdaptiveComplete}
              />
            )}

            {currentStep === 6 && <Step6_Results results={appState.selections.assessmentResults} userProfile={userProfile} allQuestions={allQuestions} courses={courses} generateRecommendations={(res)=> generateRecommendationsFromLogic(res, courses, appState.selections.topic)} />}
          </div>
        ) : (
          <div className="mt-6">
            <Explorer initialCourses={courses} />
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button onClick={prevStep} disabled={currentStep<=1} className={`px-6 py-2 rounded-full ${currentStep<=1? 'opacity-50':'bg-gray-300'}`}>← Back</button>
          {currentStep<STEP_NAMES.length && <button onClick={nextStep} className="px-6 py-2 rounded-full bg-blue-600 text-white">Next →</button>}
        </div>
      </div>
    </div>
  )
}
