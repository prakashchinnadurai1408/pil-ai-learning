export interface VideoLesson {
  id: number;
  title: string;
  moduleId: number;
  module: string;
  duration: string;
  youtubeId: string;
  completed: boolean;
}

export interface MCQQuestion {
  id: number;
  moduleId: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const videoLessons: VideoLesson[] = [
  // Module 1: Introduction to AI
  { id: 1, title: "What is Artificial Intelligence?", moduleId: 1, module: "Introduction to AI", duration: "11:02", youtubeId: "ad79nYk2keg", completed: true },
  { id: 2, title: "AI vs Machine Learning vs Deep Learning", moduleId: 1, module: "Introduction to AI", duration: "7:20", youtubeId: "RIKng6d6Fd8", completed: true },
  { id: 3, title: "How AI is Changing Education", moduleId: 1, module: "Introduction to AI", duration: "12:45", youtubeId: "hJP5GqnTrNo", completed: true },
  { id: 4, title: "AI in Daily Life — Real Examples", moduleId: 1, module: "Introduction to AI", duration: "9:30", youtubeId: "mJeNghZXtMo", completed: false },
  { id: 5, title: "History & Future of AI", moduleId: 1, module: "Introduction to AI", duration: "14:10", youtubeId: "a0_lo_GDcFw", completed: false },

  // Module 2: AI Tools for Students
  { id: 6, title: "ChatGPT Tutorial for Beginners", moduleId: 2, module: "AI Tools for Students", duration: "18:30", youtubeId: "JTxsNm9IdYU", completed: false },
  { id: 7, title: "Google Gemini Complete Guide", moduleId: 2, module: "AI Tools for Students", duration: "30:00", youtubeId: "ZpXnPLSxjhQ", completed: false },
  { id: 8, title: "Claude AI — How to Use It", moduleId: 2, module: "AI Tools for Students", duration: "49:16", youtubeId: "rRrBbyv3ChM", completed: false },
  { id: 9, title: "Perplexity AI for Research", moduleId: 2, module: "AI Tools for Students", duration: "13:18", youtubeId: "ISeZc6qKUSw", completed: false },
  { id: 10, title: "GitHub Copilot for Students", moduleId: 2, module: "AI Tools for Students", duration: "16:50", youtubeId: "Fi3AJZZregI", completed: false },

  // Module 3: Prompt Engineering
  { id: 11, title: "What is Prompt Engineering?", moduleId: 3, module: "Prompt Engineering", duration: "13:25", youtubeId: "_ZvnD73m40o", completed: false },
  { id: 12, title: "Types of Prompts Explained", moduleId: 3, module: "Prompt Engineering", duration: "11:40", youtubeId: "jC4v5AS4RIM", completed: false },
  { id: 13, title: "Zero-Shot vs Few-Shot Prompting", moduleId: 3, module: "Prompt Engineering", duration: "9:55", youtubeId: "sZIV7em3JA8", completed: false },
  { id: 14, title: "Chain of Thought Prompting", moduleId: 3, module: "Prompt Engineering", duration: "14:30", youtubeId: "H4YK_7MAckk", completed: false },
  { id: 15, title: "Advanced Prompt Frameworks", moduleId: 3, module: "Prompt Engineering", duration: "17:20", youtubeId: "1c9iyoVIwDs", completed: false },

  // Module 4: Multimodal AI
  { id: 16, title: "What is Multimodal AI?", moduleId: 4, module: "Multimodal AI", duration: "10:30", youtubeId: "WkoytlA3MoQ", completed: false },
  { id: 17, title: "AI Image Generation with DALL-E & Midjourney", moduleId: 4, module: "Multimodal AI", duration: "2:41", youtubeId: "xoZG5WQbgMw", completed: false },
  { id: 18, title: "AI Video Creation Tools", moduleId: 4, module: "Multimodal AI", duration: "14:40", youtubeId: "HK6y8DAPN_0", completed: false },
  { id: 19, title: "Voice AI and Text-to-Speech", moduleId: 4, module: "Multimodal AI", duration: "13:44", youtubeId: "1h0X9aZ8Ww8", completed: false },
  { id: 20, title: "Avatar AI — Digital Humans", moduleId: 4, module: "Multimodal AI", duration: "14:06", youtubeId: "3xNHjd43Umg", completed: false },

  // Module 5: AI Agents
  { id: 21, title: "What are AI Agents?", moduleId: 5, module: "AI Agents", duration: "15:10", youtubeId: "F8NKVhkZZWI", completed: false },
  { id: 22, title: "Building Your First AI Agent", moduleId: 5, module: "AI Agents", duration: "20:30", youtubeId: "sal78ACtGTc", completed: false },
  { id: 23, title: "Multi-Agent Systems Explained", moduleId: 5, module: "AI Agents", duration: "17:39", youtubeId: "Mi5wOpAgixw", completed: false },
  { id: 24, title: "AI Task Automation with Agents", moduleId: 5, module: "AI Agents", duration: "20:10", youtubeId: "cXnPxN06boY", completed: false },

  // Module 6: LLM Models & Providers
  { id: 25, title: "What are Large Language Models?", moduleId: 6, module: "LLM Models & Providers", duration: "14:50", youtubeId: "iR2O2GPbB0E", completed: false },
  { id: 26, title: "Understanding Tokens & Context Windows", moduleId: 6, module: "LLM Models & Providers", duration: "11:30", youtubeId: "-QVoIxEpFkM", completed: false },
  { id: 27, title: "OpenAI vs Anthropic vs Google Models", moduleId: 6, module: "LLM Models & Providers", duration: "9:58", youtubeId: "CumRswBv07I", completed: false },
  { id: 28, title: "Open Source LLMs — Llama, Mistral & More", moduleId: 6, module: "LLM Models & Providers", duration: "15:20", youtubeId: "HzGJqs_y2Vc", completed: false },

  // Module 7: AI Workflow Automation
  { id: 29, title: "Introduction to AI Workflows", moduleId: 7, module: "AI Workflow Automation", duration: "13:15", youtubeId: "hG0k7tHoJJM", completed: false },
  { id: 30, title: "Automating Research with AI", moduleId: 7, module: "AI Workflow Automation", duration: "16:40", youtubeId: "7_qA3_VPkWI", completed: false },
  { id: 31, title: "AI Content Creation Pipelines", moduleId: 7, module: "AI Workflow Automation", duration: "14:55", youtubeId: "rIEhtXRFPfk", completed: false },
  { id: 32, title: "Study Automation Using AI", moduleId: 7, module: "AI Workflow Automation", duration: "11:30", youtubeId: "IHeUQsuVVAA", completed: false },

  // Module 8: RAG
  { id: 33, title: "What is RAG? Complete Explanation", moduleId: 8, module: "RAG", duration: "17:20", youtubeId: "T-D1OfcDW1M", completed: false },
  { id: 34, title: "Vector Databases Explained", moduleId: 8, module: "RAG", duration: "14:10", youtubeId: "dN0lsF2cvm4", completed: false },
  { id: 35, title: "Building a RAG System Step by Step", moduleId: 8, module: "RAG", duration: "22:30", youtubeId: "u47GtXwePms", completed: false },
  { id: 36, title: "Knowledge Bases & AI Retrieval", moduleId: 8, module: "RAG", duration: "13:45", youtubeId: "mE7IDf2SmJg", completed: false },

  // Module 9: Fine-Tuning AI
  { id: 37, title: "What is Fine-Tuning?", moduleId: 9, module: "Fine-Tuning AI", duration: "12:40", youtubeId: "kCc8FmEb1nY", completed: false },
  { id: 38, title: "Dataset Preparation for Fine-Tuning", moduleId: 9, module: "Fine-Tuning AI", duration: "15:50", youtubeId: "eC6Hd1hFvos", completed: false },
  { id: 39, title: "Fine-Tuning GPT Models Tutorial", moduleId: 9, module: "Fine-Tuning AI", duration: "20:15", youtubeId: "pJ9Y0BO7Rr8", completed: false },
  { id: 40, title: "Building Custom AI Assistants", moduleId: 9, module: "Fine-Tuning AI", duration: "18:30", youtubeId: "VPBXuOEMNOA", completed: false },

  // Module 10: AI SaaS Development
  { id: 41, title: "Building AI Products — Where to Start", moduleId: 10, module: "AI SaaS Development", duration: "29:27", youtubeId: "y6DSUCB_0uE", completed: false },
  { id: 42, title: "AI APIs — Integration Guide", moduleId: 10, module: "AI SaaS Development", duration: "23:46", youtubeId: "czvVibB2lRA", completed: false },
  { id: 43, title: "AI Startup Opportunities for Students", moduleId: 10, module: "AI SaaS Development", duration: "49:14", youtubeId: "rQcXmY6rSVY", completed: false },
  { id: 44, title: "Deploying Your First AI App", moduleId: 10, module: "AI SaaS Development", duration: "43:12", youtubeId: "sO6NSSOWDO0", completed: false },
];

export const mcqBank: MCQQuestion[] = [
  // Module 1: Introduction to AI (10 questions)
  { id: 1, moduleId: 1, question: "What does AI stand for?", options: ["Artificial Intelligence", "Automated Integration", "Advanced Interface", "Algorithmic Innovation"], correct: 0, explanation: "AI stands for Artificial Intelligence — the simulation of human intelligence by machines." },
  { id: 2, moduleId: 1, question: "Which of the following is a subset of AI?", options: ["Cloud Computing", "Machine Learning", "Blockchain", "Cybersecurity"], correct: 1, explanation: "Machine Learning is a subset of AI focused on learning from data." },
  { id: 3, moduleId: 1, question: "What is Deep Learning?", options: ["A type of database", "A subset of Machine Learning using neural networks", "A programming language", "A hardware component"], correct: 1, explanation: "Deep Learning uses multi-layered neural networks to learn complex patterns." },
  { id: 4, moduleId: 1, question: "Which AI application is used in email spam filters?", options: ["Computer Vision", "Natural Language Processing", "Robotics", "Quantum Computing"], correct: 1, explanation: "NLP helps classify emails as spam or legitimate by understanding text patterns." },
  { id: 5, moduleId: 1, question: "Who is considered the father of AI?", options: ["Elon Musk", "Alan Turing", "John McCarthy", "Steve Jobs"], correct: 2, explanation: "John McCarthy coined the term 'Artificial Intelligence' in 1956." },
  { id: 6, moduleId: 1, question: "What is the Turing Test?", options: ["A coding exam", "A test to determine if AI can exhibit human-like intelligence", "A hardware benchmark", "A database query test"], correct: 1, explanation: "The Turing Test evaluates whether a machine can exhibit intelligent behavior indistinguishable from a human." },
  { id: 7, moduleId: 1, question: "Which industry uses AI for diagnosis?", options: ["Healthcare", "Mining", "Textile", "Agriculture only"], correct: 0, explanation: "Healthcare extensively uses AI for medical image analysis and disease diagnosis." },
  { id: 8, moduleId: 1, question: "What is a neural network inspired by?", options: ["Computer circuits", "The human brain", "Solar panels", "Cloud servers"], correct: 1, explanation: "Neural networks are computational models inspired by the structure of biological neurons." },
  { id: 9, moduleId: 1, question: "What type of AI can perform any intellectual task a human can?", options: ["Narrow AI", "General AI (AGI)", "Reactive AI", "Simple AI"], correct: 1, explanation: "Artificial General Intelligence (AGI) would match human-level cognitive abilities across all domains." },
  { id: 10, moduleId: 1, question: "Which is NOT an example of AI in daily life?", options: ["Voice assistants (Siri/Alexa)", "Recommendation engines (Netflix)", "Manual spreadsheet calculation", "Autonomous vehicles"], correct: 2, explanation: "Manual spreadsheet calculation is human-driven, not AI-powered." },

  // Module 2: AI Tools for Students (10 questions)
  { id: 11, moduleId: 2, question: "Which company created ChatGPT?", options: ["Google", "Meta", "OpenAI", "Microsoft"], correct: 2, explanation: "ChatGPT was created by OpenAI." },
  { id: 12, moduleId: 2, question: "What is Google's AI chatbot called?", options: ["Alexa", "Gemini", "Siri", "Watson"], correct: 1, explanation: "Google's AI chatbot is called Gemini (formerly Bard)." },
  { id: 13, moduleId: 2, question: "What is Perplexity AI best known for?", options: ["Image generation", "AI-powered search with citations", "Video editing", "Music creation"], correct: 1, explanation: "Perplexity AI is an AI-powered search engine that provides answers with source citations." },
  { id: 14, moduleId: 2, question: "GitHub Copilot is primarily used for?", options: ["Writing essays", "AI-assisted code writing", "Photo editing", "Data entry"], correct: 1, explanation: "GitHub Copilot is an AI pair programmer that suggests code completions." },
  { id: 15, moduleId: 2, question: "Which AI tool is created by Anthropic?", options: ["ChatGPT", "Claude", "Gemini", "Copilot"], correct: 1, explanation: "Claude is Anthropic's AI assistant, designed with a focus on safety." },
  { id: 16, moduleId: 2, question: "What can AI writing tools help students with?", options: ["Only writing code", "Drafting essays, summarizing, and brainstorming", "Physical experiments", "Hardware repair"], correct: 1, explanation: "AI writing tools assist with drafting, summarization, brainstorming, and editing text." },
  { id: 17, moduleId: 2, question: "Which tool is best for AI-powered research summarization?", options: ["Photoshop", "Perplexity / ChatGPT", "Excel", "PowerPoint"], correct: 1, explanation: "AI chatbots like Perplexity and ChatGPT can quickly summarize research papers." },
  { id: 18, moduleId: 2, question: "What is a key advantage of using AI tools for studying?", options: ["They replace teachers completely", "They save time and enhance understanding", "They guarantee perfect grades", "They write exams for you"], correct: 1, explanation: "AI tools help students learn faster by providing instant explanations and summaries." },
  { id: 19, moduleId: 2, question: "Which AI tool can generate images from text?", options: ["DALL-E", "GitHub Copilot", "Grammarly", "Notion AI"], correct: 0, explanation: "DALL-E by OpenAI generates images from text descriptions." },
  { id: 20, moduleId: 2, question: "What should students be cautious about when using AI tools?", options: ["Using them at all", "Verifying AI-generated information for accuracy", "The color of the interface", "The speed of responses"], correct: 1, explanation: "AI can hallucinate or produce inaccurate information, so verification is essential." },

  // Module 3: Prompt Engineering (10 questions)
  { id: 21, moduleId: 3, question: "What is Prompt Engineering?", options: ["Writing instructions for AI to get desired outputs", "Building AI hardware", "Training neural networks from scratch", "Designing computer chips"], correct: 0, explanation: "Prompt Engineering is the art of crafting effective instructions for AI models." },
  { id: 22, moduleId: 3, question: "What is a 'zero-shot' prompt?", options: ["A prompt with no examples", "A prompt that fails", "A prompt with many examples", "A deleted prompt"], correct: 0, explanation: "Zero-shot prompting asks the AI to perform a task without providing any examples." },
  { id: 23, moduleId: 3, question: "What is 'few-shot' prompting?", options: ["Giving the AI a few examples before asking", "Asking very short questions", "Using AI only a few times", "Prompting with images only"], correct: 0, explanation: "Few-shot prompting provides a few examples to guide the AI's response format." },
  { id: 24, moduleId: 3, question: "What is 'Chain of Thought' prompting?", options: ["Linking multiple AI models", "Asking AI to show step-by-step reasoning", "Creating a chatbot chain", "Sending multiple prompts at once"], correct: 1, explanation: "Chain of Thought prompting asks the model to reason through problems step by step." },
  { id: 25, moduleId: 3, question: "Which prompt is more effective?", options: ["'Write something about AI'", "'Write a 500-word essay on AI in healthcare with 3 examples'", "Both are equally effective", "'AI'"], correct: 1, explanation: "Specific, detailed prompts with constraints produce much better AI outputs." },
  { id: 26, moduleId: 3, question: "What is a 'system prompt'?", options: ["An error message", "Instructions that define the AI's role and behavior", "A hardware command", "A login prompt"], correct: 1, explanation: "System prompts set the AI's persona, tone, and behavioral constraints." },
  { id: 27, moduleId: 3, question: "What does 'prompt chaining' mean?", options: ["Using output of one prompt as input for the next", "Writing very long prompts", "Deleting prompts", "Copying prompts from others"], correct: 0, explanation: "Prompt chaining breaks complex tasks into sequential prompts that build on each other." },
  { id: 28, moduleId: 3, question: "What is the CRISPE framework in prompting?", options: ["A cooking method", "Capacity, Role, Insight, Statement, Personality, Experiment", "A database structure", "A programming language"], correct: 1, explanation: "CRISPE is a structured framework for writing comprehensive AI prompts." },
  { id: 29, moduleId: 3, question: "Why is context important in prompts?", options: ["It makes prompts longer", "It helps AI understand the specific situation better", "It is not important", "It slows down AI"], correct: 1, explanation: "Context gives the AI relevant background to produce more accurate and relevant responses." },
  { id: 30, moduleId: 3, question: "What is 'temperature' in AI models?", options: ["The heat of the server", "A parameter controlling response randomness/creativity", "The speed of processing", "The model's accuracy score"], correct: 1, explanation: "Temperature controls how creative vs deterministic AI responses are (0 = focused, 1 = creative)." },

  // Module 4: Multimodal AI (8 questions)
  { id: 31, moduleId: 4, question: "What is Multimodal AI?", options: ["AI that processes only text", "AI that can handle multiple types of input (text, image, audio, video)", "AI for mobile phones only", "AI that runs multiple programs"], correct: 1, explanation: "Multimodal AI processes and generates multiple data types including text, images, audio, and video." },
  { id: 32, moduleId: 4, question: "Which tool is used for AI image generation?", options: ["Excel", "Midjourney", "Notepad", "Calculator"], correct: 1, explanation: "Midjourney is a popular AI tool for generating images from text descriptions." },
  { id: 33, moduleId: 4, question: "What is Text-to-Speech (TTS)?", options: ["Converting speech to text", "Converting text into spoken audio", "Translating text to another language", "Compressing text files"], correct: 1, explanation: "TTS converts written text into natural-sounding spoken audio using AI." },
  { id: 34, moduleId: 4, question: "What is an AI Avatar?", options: ["A profile picture", "A digital human powered by AI", "A robot", "A video game character only"], correct: 1, explanation: "AI avatars are digital representations of humans that can speak and express emotions using AI." },
  { id: 35, moduleId: 4, question: "Which company created DALL-E?", options: ["Google", "Meta", "OpenAI", "Apple"], correct: 2, explanation: "DALL-E is OpenAI's text-to-image generation model." },
  { id: 36, moduleId: 4, question: "What can AI video tools like Sora do?", options: ["Only edit existing videos", "Generate videos from text prompts", "Only compress videos", "Only add subtitles"], correct: 1, explanation: "Sora and similar tools can generate realistic video content from text descriptions." },
  { id: 37, moduleId: 4, question: "What is computer vision?", options: ["A brand of glasses", "AI's ability to interpret visual information from images/video", "A computer monitor brand", "A type of VR headset"], correct: 1, explanation: "Computer vision enables AI to analyze and understand visual content from images and videos." },
  { id: 38, moduleId: 4, question: "Which is a voice AI assistant?", options: ["Photoshop", "Alexa", "GitHub", "Docker"], correct: 1, explanation: "Amazon's Alexa is a voice-activated AI assistant." },

  // Module 5: AI Agents (8 questions)
  { id: 39, moduleId: 5, question: "What is an AI Agent?", options: ["A human AI researcher", "An autonomous AI system that can plan and execute tasks", "A type of database", "An AI training dataset"], correct: 1, explanation: "AI agents are autonomous systems that can perceive, decide, and act to accomplish goals." },
  { id: 40, moduleId: 5, question: "What makes AI agents different from chatbots?", options: ["Agents can take autonomous actions and use tools", "They are exactly the same", "Agents are simpler", "Agents only work offline"], correct: 0, explanation: "Unlike simple chatbots, AI agents can autonomously plan, use tools, and take actions." },
  { id: 41, moduleId: 5, question: "What is a multi-agent system?", options: ["Multiple users on one AI", "Multiple AI agents collaborating to solve complex tasks", "Multiple computers running AI", "Multiple screens showing AI"], correct: 1, explanation: "Multi-agent systems involve multiple specialized AI agents working together." },
  { id: 42, moduleId: 5, question: "Which is an example of AI task automation?", options: ["Manually writing reports", "AI scheduling meetings and sending follow-ups", "Hand-sorting mail", "Using a calculator"], correct: 1, explanation: "AI agents can automate repetitive tasks like scheduling, email management, and data processing." },
  { id: 43, moduleId: 5, question: "What is 'tool use' in AI agents?", options: ["Using physical tools", "AI agents calling external APIs and services to complete tasks", "Building hardware tools", "Repairing AI systems"], correct: 1, explanation: "Tool use allows agents to interact with external services, databases, and APIs." },
  { id: 44, moduleId: 5, question: "What is the ReAct framework?", options: ["A JavaScript library", "Reasoning + Acting — a pattern for AI agents", "A chemical reaction simulator", "A social media platform"], correct: 1, explanation: "ReAct combines reasoning and acting, where agents think step-by-step then take actions." },
  { id: 45, moduleId: 5, question: "What is agent memory?", options: ["Computer RAM", "The ability of agents to remember past interactions and context", "A storage device", "A backup system"], correct: 1, explanation: "Agent memory allows AI agents to maintain context across interactions for better performance." },
  { id: 46, moduleId: 5, question: "Which platform is known for building AI agents?", options: ["Microsoft Paint", "LangChain / CrewAI", "Notepad", "iTunes"], correct: 1, explanation: "LangChain and CrewAI are popular frameworks for building AI agent systems." },

  // Module 6: LLM Models & Providers (8 questions)
  { id: 47, moduleId: 6, question: "What does LLM stand for?", options: ["Large Language Model", "Light Learning Machine", "Linear Logic Module", "Low Latency Memory"], correct: 0, explanation: "LLM stands for Large Language Model — AI models trained on vast text data." },
  { id: 48, moduleId: 6, question: "What is a 'token' in LLMs?", options: ["A physical coin", "A unit of text (word or subword) processed by the model", "A login credential", "A type of API key"], correct: 1, explanation: "Tokens are the fundamental units of text that LLMs process — roughly 4 characters per token." },
  { id: 49, moduleId: 6, question: "What is a 'context window'?", options: ["A browser window", "The maximum amount of text an LLM can process at once", "A display setting", "A file format"], correct: 1, explanation: "The context window defines how much text an LLM can read and consider in a single interaction." },
  { id: 50, moduleId: 6, question: "Which company created GPT models?", options: ["Google", "OpenAI", "Amazon", "Apple"], correct: 1, explanation: "OpenAI developed the GPT (Generative Pre-trained Transformer) series of models." },
  { id: 51, moduleId: 6, question: "What is Llama?", options: ["An animal", "Meta's open-source LLM", "A cloud service", "A database"], correct: 1, explanation: "Llama is Meta's family of open-source large language models." },
  { id: 52, moduleId: 6, question: "What does 'fine-tuning' an LLM mean?", options: ["Making it run faster", "Training a pre-trained model on specific data for a task", "Deleting the model", "Changing its color"], correct: 1, explanation: "Fine-tuning adapts a pre-trained model to perform better on specific tasks or domains." },
  { id: 53, moduleId: 6, question: "What is 'hallucination' in LLMs?", options: ["The AI seeing things", "When AI generates plausible but factually incorrect information", "A hardware error", "A display glitch"], correct: 1, explanation: "Hallucination occurs when LLMs generate confident but inaccurate or fabricated information." },
  { id: 54, moduleId: 6, question: "Which model is known for the largest context window?", options: ["GPT-3", "Gemini 1.5 Pro (1M tokens)", "BERT", "Word2Vec"], correct: 1, explanation: "Google's Gemini 1.5 Pro supports up to 1 million tokens in its context window." },

  // Module 7: AI Workflow Automation (6 questions)
  { id: 55, moduleId: 7, question: "What is an AI workflow?", options: ["A physical assembly line", "A series of AI-automated steps to complete a task", "An AI exercise routine", "A network cable setup"], correct: 1, explanation: "AI workflows chain together automated steps where AI handles each stage of a process." },
  { id: 56, moduleId: 7, question: "Which tool is popular for AI automation?", options: ["Zapier / Make / n8n", "Microsoft Paint", "Calculator", "Notepad"], correct: 0, explanation: "Zapier, Make, and n8n are popular platforms for creating AI-powered automations." },
  { id: 57, moduleId: 7, question: "How can AI automate research?", options: ["By physically going to libraries", "By searching, summarizing, and synthesizing information automatically", "By printing papers", "By deleting old research"], correct: 1, explanation: "AI can search databases, summarize papers, extract key findings, and compile reports automatically." },
  { id: 58, moduleId: 7, question: "What is content creation automation?", options: ["Manually writing content", "Using AI to generate, edit, and publish content systematically", "Printing physical books", "Copying others' content"], correct: 1, explanation: "AI content automation involves using AI to draft, edit, optimize, and schedule content." },
  { id: 59, moduleId: 7, question: "What is a productivity pipeline?", options: ["A plumbing tool", "A sequence of AI tools that process work from input to output", "A type of internet connection", "An email client"], correct: 1, explanation: "A productivity pipeline chains AI tools together to transform inputs into finished outputs." },
  { id: 60, moduleId: 7, question: "Which is a benefit of AI study automation?", options: ["It replaces all learning", "It helps create study notes, flashcards, and summaries faster", "It takes longer than manual study", "It only works for math"], correct: 1, explanation: "AI automation can quickly generate study materials, saving students hours of preparation." },

  // Module 8: RAG (8 questions)
  { id: 61, moduleId: 8, question: "What does RAG stand for?", options: ["Retrieval Augmented Generation", "Random Algorithm Generation", "Real-time AI Gateway", "Recursive Attention Graph"], correct: 0, explanation: "RAG stands for Retrieval Augmented Generation — combining retrieval with generation." },
  { id: 62, moduleId: 8, question: "Why is RAG important?", options: ["It makes AI faster", "It allows AI to access and cite specific, up-to-date information", "It reduces AI cost only", "It is not important"], correct: 1, explanation: "RAG enables AI to reference specific documents, reducing hallucination and providing current info." },
  { id: 63, moduleId: 8, question: "What is a vector database?", options: ["A regular SQL database", "A database optimized for storing and searching high-dimensional vectors", "A spreadsheet", "A type of hard drive"], correct: 1, explanation: "Vector databases store numerical representations (embeddings) of text for semantic search." },
  { id: 64, moduleId: 8, question: "What is an 'embedding' in RAG?", options: ["A physical attachment", "A numerical representation of text that captures its meaning", "A video file", "A type of font"], correct: 1, explanation: "Embeddings convert text into numerical vectors that represent semantic meaning." },
  { id: 65, moduleId: 8, question: "Which is a popular vector database?", options: ["MySQL", "Pinecone / Weaviate / ChromaDB", "Notepad", "PowerPoint"], correct: 1, explanation: "Pinecone, Weaviate, and ChromaDB are popular vector databases used in RAG systems." },
  { id: 66, moduleId: 8, question: "What is 'chunking' in RAG?", options: ["Eating food", "Breaking documents into smaller pieces for processing", "Compressing files", "Deleting data"], correct: 1, explanation: "Chunking splits large documents into smaller segments for efficient embedding and retrieval." },
  { id: 67, moduleId: 8, question: "How does RAG reduce hallucination?", options: ["It doesn't", "By grounding AI responses in actual retrieved documents", "By slowing down AI", "By limiting vocabulary"], correct: 1, explanation: "RAG forces the AI to base responses on retrieved factual content rather than relying solely on training data." },
  { id: 68, moduleId: 8, question: "What is a knowledge base in RAG?", options: ["A person's brain", "A curated collection of documents the AI can search through", "A textbook", "A website"], correct: 1, explanation: "A knowledge base is a structured repository of documents that the RAG system can search and reference." },

  // Module 9: Fine-Tuning AI (6 questions)
  { id: 69, moduleId: 9, question: "What is the purpose of fine-tuning?", options: ["To create a new model from scratch", "To adapt a pre-trained model for a specific task or domain", "To delete a model", "To make models bigger"], correct: 1, explanation: "Fine-tuning customizes pre-trained models to perform better on specific use cases." },
  { id: 70, moduleId: 9, question: "What data format is commonly used for fine-tuning?", options: ["PDF files", "JSONL with prompt-completion pairs", "MP3 files", "ZIP archives"], correct: 1, explanation: "Fine-tuning typically uses JSONL files with structured prompt-completion training examples." },
  { id: 71, moduleId: 9, question: "What is LoRA in fine-tuning?", options: ["A name", "Low-Rank Adaptation — an efficient fine-tuning technique", "A database", "A programming language"], correct: 1, explanation: "LoRA enables efficient fine-tuning by training only a small number of additional parameters." },
  { id: 72, moduleId: 9, question: "How many examples are typically needed for fine-tuning?", options: ["1-2 examples", "At least 50-100+ high-quality examples", "Millions always", "No examples needed"], correct: 1, explanation: "Effective fine-tuning usually requires at least 50-100+ carefully curated training examples." },
  { id: 73, moduleId: 9, question: "What is a custom AI assistant?", options: ["A robot butler", "An AI model fine-tuned for specific tasks or a specific domain", "A human assistant", "A search engine"], correct: 1, explanation: "Custom AI assistants are models trained or configured for specific business or domain needs." },
  { id: 74, moduleId: 9, question: "What is the risk of poor training data?", options: ["No risk", "The model will learn incorrect patterns and produce bad outputs", "The model gets smarter", "It makes no difference"], correct: 1, explanation: "Low-quality or biased training data leads to poor model performance and inaccurate outputs." },

  // Module 10: AI SaaS Development (6 questions)
  { id: 75, moduleId: 10, question: "What is AI SaaS?", options: ["A type of food", "Software as a Service powered by AI", "A hardware product", "A social network"], correct: 1, explanation: "AI SaaS combines AI capabilities with the SaaS delivery model for scalable AI applications." },
  { id: 76, moduleId: 10, question: "What is an AI API?", options: ["A physical interface", "A programmable interface to access AI model capabilities", "A type of AI model", "An operating system"], correct: 1, explanation: "AI APIs allow developers to integrate AI capabilities into their applications via HTTP requests." },
  { id: 77, moduleId: 10, question: "Which is a common way to monetize AI products?", options: ["Giving everything free", "Subscription pricing, usage-based pricing, or freemium models", "Selling hardware only", "Advertising only"], correct: 1, explanation: "AI SaaS products typically use subscription, usage-based, or freemium pricing strategies." },
  { id: 78, moduleId: 10, question: "What is important when building AI products?", options: ["Only the technology", "User experience, reliability, and solving real problems", "Making it as complex as possible", "Using the most expensive AI model"], correct: 1, explanation: "Successful AI products focus on UX, reliability, and solving genuine user problems." },
  { id: 79, moduleId: 10, question: "What is an AI wrapper?", options: ["Gift wrapping with AI", "An application built on top of existing AI APIs", "A type of encryption", "An AI competitor"], correct: 1, explanation: "AI wrappers are applications that add value by building specialized interfaces around existing AI APIs." },
  { id: 80, moduleId: 10, question: "What should students learn to build AI apps?", options: ["Only machine learning math", "API integration, frontend development, and prompt engineering", "Only hardware design", "Only graphic design"], correct: 1, explanation: "Building AI apps requires understanding APIs, web development, and how to effectively use AI models." },
];

export const moduleNames: Record<number, string> = {
  1: "Introduction to AI",
  2: "AI Tools for Students",
  3: "Prompt Engineering",
  4: "Multimodal AI",
  5: "AI Agents",
  6: "LLM Models & Providers",
  7: "AI Workflow Automation",
  8: "RAG",
  9: "Fine-Tuning AI",
  10: "AI SaaS Development",
};
