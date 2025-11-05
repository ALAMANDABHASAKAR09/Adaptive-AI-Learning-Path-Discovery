import React from 'react'

export default function StepIndicator({ stepNames, currentStep, maxStep, goToStep }){
  return (
    <div className="flex justify-between p-4 bg-white rounded-lg shadow-sm">
      {stepNames.map((name, idx)=>{
        const step = idx+1
        const classes = `w-8 h-8 flex items-center justify-center rounded-full font-bold ${step<currentStep? 'bg-green-500 text-white': step===currentStep? 'bg-yellow-400 text-black':'bg-gray-200 text-gray-600'}`
        return (
          <div key={name} className="text-center flex-1">
            <div className="flex items-center justify-center mb-1">
              <div className={classes} onClick={()=> step<=maxStep && goToStep(step)} style={{cursor: step<=maxStep? 'pointer':'default'}}>{step}</div>
            </div>
            <p className="text-xs font-medium text-gray-600 hidden sm:block">{name}</p>
          </div>
        )
      })}
    </div>
  )
}
