import React, { useEffect, useState } from 'react'
export default function Header({ onSearch }){
  const [query, setQuery] = useState('')
  const [isDark, setIsDark] = useState(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))

  useEffect(()=>{
    // keep internal state in sync if other code toggles the class
    const obs = new MutationObserver(()=> setIsDark(document.documentElement.classList.contains('dark')))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return ()=> obs.disconnect()
  },[])

  function toggle(){
    document.documentElement.classList.toggle('dark')
    setIsDark(document.documentElement.classList.contains('dark'))
  }

  return (
    <header className="flex items-center justify-between py-6">
      <div>
        <div className="text-3xl font-extrabold text-yellow-400">AI AGENT XPLORER</div>
        <div className="text-sm text-gray-600 dark:text-gray-300">Discover curated courses & learning paths</div>
      </div>

      <div className="flex items-center gap-4 w-1/2">
        <input aria-label="Search" value={query} onChange={e=> { setQuery(e.target.value); onSearch && onSearch(e.target.value) }} placeholder="Search for 'LLM', 'RAG', 'prompt engineering'..." className="w-full p-3 rounded-lg border bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100" />

        <div role="button" aria-pressed={isDark} onClick={toggle} className="theme-toggle" title="Toggle theme">
          <div className="switch relative">
            <div className="knob" />
          </div>
        </div>
      </div>
    </header>
  )
}
