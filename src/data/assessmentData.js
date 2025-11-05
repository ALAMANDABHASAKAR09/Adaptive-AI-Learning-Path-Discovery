export const STAGE_WEIGHTS = {
  Basics: 1,
  Concepts: 3,
  Depth: 5,
}
export const STAGES = ['Basics','Concepts','Depth']
export const ALL_DOMAINS = ['Core ML','Ethics/Impact','RAG/Vector','Data','Architecture']

export const ALL_QUESTIONS = [
  { id: 'b1', stage: 'Basics', type: 'MCQ', text: 'What data structure is primarily used by RAG systems to store text fragments for semantic search?', domains: ['RAG/Vector'], options: ['SQL Table','Vector Database','JSON file','In-memory cache'], correctAnswer: 'Vector Database' },
  { id: 'b2', stage: 'Basics', type: 'MCQ', text: 'What does the term "LLM" stand for?', domains: ['Core ML'], options: ['Large Logic Model','Long Learning Machine','Large Language Model','Layered Language Module'], correctAnswer: 'Large Language Model' },
  { id: 'b3', stage: 'Basics', type: 'MCQ', text: 'Which term describes a primary ethical concern related to LLMs learning from biased internet data?', domains: ['Ethics/Impact'], options: ['Model Drift','Overfitting','Data Poisoning','Bias Amplification'], correctAnswer: 'Bias Amplification' },
  { id: 'b4', stage: 'Basics', type: 'MCQ', text: 'In Python, which library is most commonly used for basic data manipulation and analysis?', domains: ['Data'], options: ['PyTorch','Pandas','Langchain','Matplotlib'], correctAnswer: 'Pandas' },
  { id: 'b5', stage: 'Basics', type: 'MCQ', text: 'What is the "Retrieval" part of RAG responsible for?', domains: ['RAG/Vector'], options: ['Generating the final answer','Finding relevant documents','Fine-tuning the model','Converting text to tokens'], correctAnswer: 'Finding relevant documents' },
  { id: 'b6', stage: 'Basics', type: 'MCQ', text: 'What is the primary purpose of a "Chain" in the Langchain library?', domains: ['Architecture'], options: ['To store vector embeddings','To connect multiple components in a sequence','To test for hallucinations','To filter user input'], correctAnswer: 'To connect multiple components in a sequence' },
  { id: 'c1', stage: 'Concepts', type: 'ShortAnswer', text: 'Name two essential techniques a developer uses in Python to integrate an LLM\'s response into a production web application.', domains: ['Architecture','Data'], minLength: 75, helpText: 'Minimum 75 words.' },
  { id: 'c2', stage: 'Concepts', type: 'ShortAnswer', text: 'Describe the two main stages of a RAG pipeline (Indexing and Retrieval/Generation). What happens in each?', domains: ['RAG/Vector'], minLength: 75, helpText: 'Minimum 75 words.' },
  { id: 'c3', stage: 'Concepts', type: 'ShortAnswer', text: 'Explain the role of "Agents" and "Tools" in Langchain. How do they work together?', domains: ['Architecture','Core ML'], minLength: 75, helpText: 'Minimum 75 words.' },
  { id: 'c4', stage: 'Concepts', type: 'ShortAnswer', text: 'A user complains your AI chatbot gave a harmful, biased answer. What are two different *technical* steps you could take to address this?', domains: ['Ethics/Impact','Data'], minLength: 75, helpText: 'Minimum 75 words.' },
  { id: 'd1', stage: 'Depth', type: 'LongAnswer', text: 'Explain why relying solely on Fine-Tuning is often a poor architectural choice for a domain-specific internal chatbot compared to using RAG.', domains: ['RAG/Vector','Architecture'], minLength: 150, helpText: 'Minimum 150 words.' },
  { id: 'd2', stage: 'Depth', type: 'LongAnswer', text: 'You are designing an AI for medical diagnosis. What are the top 3 *ethical* and *architectural* risks you must design for, and how would you mitigate them?', domains: ['Ethics/Impact','Architecture'], minLength: 150, helpText: 'Minimum 150 words.' },
]

export const STAGED_QUESTIONS = {
  Basics: ALL_QUESTIONS.filter(q=>q.stage==='Basics'),
  Concepts: ALL_QUESTIONS.filter(q=>q.stage==='Concepts'),
  Depth: ALL_QUESTIONS.filter(q=>q.stage==='Depth')
}
