export interface ProjectDocument {
  code: string;
  title: string;
  description: string;
}

export interface ProjectStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  whatHappens: string[];
  documents: ProjectDocument[];
  deliverable: string;
  duration: string;
  additionalInfo?: string[];
}

export interface ProjectStream {
  id: "tech" | "non-tech" | "mba-casestudy";
  title: string;
  subtitle: string;
  stepsCount: number;
  description: string;
  steps: ProjectStep[];
}

export const techStream: ProjectStream = {
  id: "tech",
  title: "Tech Project Stream",
  subtitle: "Software / IT / Engineering",
  stepsCount: 8,
  description: "Complete lifecycle of a technical college project in Software Engineering, IT, Computer Science, or Electronics. Follow all 8 steps sequentially from ideation to final evaluation.",
  steps: [
    {
      stepNumber: 1,
      title: "Project Ideation & Topic Selection",
      subtitle: "Choose a relevant problem and define the project scope",
      whatHappens: [
        "Brainstorm topics — identify a real-world problem your project will solve (e.g. Library Management System, Smart Attendance App, Chatbot)",
        "Select your team — form a group of 2-5 students as per college guidelines",
        "Get faculty approval — submit a 1-page project abstract to your guide/teacher for approval",
        "Assign roles — project lead, frontend developer, backend developer, tester, documentation writer",
      ],
      documents: [
        { code: "AB", title: "Project Abstract (1 page)", description: "Problem statement, proposed solution, technology stack, expected outcome" },
        { code: "TP", title: "Topic Approval Form", description: "Signed by faculty guide / HOD" },
        { code: "TM", title: "Team Formation Sheet", description: "Names, roll numbers, and roles assigned to each member" },
      ],
      deliverable: "Approved Abstract",
      duration: "Week 1",
    },
    {
      stepNumber: 2,
      title: "Requirements Gathering & SRS Document",
      subtitle: "Define what the system must do — functional & non-functional requirements",
      whatHappens: [
        "Identify stakeholders — who will use this system? (admin, student, teacher, public)",
        "List functional requirements — login, CRUD operations, search, reports, notifications etc.",
        "List non-functional requirements — performance, security, scalability, usability",
        "Write SRS — Software Requirements Specification using IEEE 830 standard format",
      ],
      documents: [
        { code: "SR", title: "SRS Document", description: "Introduction, Overall Description, System Features, External Interface Requirements, Non-Functional Requirements, Constraints" },
        { code: "UC", title: "Use Case Diagram", description: "Actors and their interactions with the system" },
        { code: "DF", title: "Data Flow Diagram (DFD)", description: "Level 0 context diagram and Level 1 DFD" },
      ],
      deliverable: "SRS Document",
      duration: "Week 2",
    },
    {
      stepNumber: 3,
      title: "System Design & Architecture",
      subtitle: "Blueprint the system — database, UI, modules, and flow",
      whatHappens: [
        "High-Level Design (HLD) — system architecture, modules, technology stack selection",
        "Low-Level Design (LLD) — class diagrams, ER diagrams, sequence diagrams, detailed module design",
        "Database Design — tables, columns, data types, primary & foreign keys, relationships",
        "UI Wireframes — rough screen layouts for each module using tools like Figma, Balsamiq",
        "Tech Stack Finalization — Frontend (HTML/React/Angular), Backend (Python/Java/Node), DB (MySQL/MongoDB)",
      ],
      documents: [
        { code: "SD", title: "System Design Document (SDD)", description: "HLD + LLD combined report" },
        { code: "ER", title: "ER Diagram", description: "Entity-relationship diagram with all tables and keys" },
        { code: "UI", title: "UI Wireframe Screens", description: "Screenshots or PDF exports from design tool" },
        { code: "CD", title: "Class Diagram / Sequence Diagram", description: "For OOP-based projects" },
      ],
      deliverable: "SDD + ER Diagram",
      duration: "Weeks 3-4",
    },
    {
      stepNumber: 4,
      title: "Coding / Development",
      subtitle: "Write, structure, and version-control all source code",
      whatHappens: [
        "Set up project repository — create GitHub / GitLab repo, define folder structure, set up .gitignore",
        "Code module by module — develop each feature in a separate branch, follow naming conventions",
        "Add inline comments — document every function, class, and critical logic block clearly",
        "Commit regularly — meaningful commit messages like 'feat: add user login module'",
        "Peer code review — team members review each other's code before merging to main",
      ],
      documents: [
        { code: "SC", title: "Complete Source Code", description: "All files committed to repository with README" },
        { code: "CD", title: "Code Documentation", description: "Inline comments + separate code walkthrough PDF" },
        { code: "GH", title: "GitHub Repository Link", description: "Shared with teacher for review" },
      ],
      deliverable: "Source Code + Repository",
      duration: "Weeks 5-10",
      additionalInfo: [
        "Recommended folder structure: /frontend, /backend, /database, /docs",
        "Include requirements.txt / package.json for dependencies",
        "Write a clear README.md with install and run instructions",
      ],
    },
    {
      stepNumber: 5,
      title: "Compile & Build the Project",
      subtitle: "Compile code, resolve errors, and prepare a running build",
      whatHappens: [
        "Set up development environment — install dependencies, configure environment variables (.env file)",
        "Run compiler / interpreter — resolve all syntax errors and import issues",
        "Fix build errors — address all warnings, deprecation issues, and missing dependency errors",
        "Generate build artifact — .exe / .jar / .apk / dist/ folder depending on tech stack",
        "Document setup steps — write a step-by-step README.md with install and run instructions",
      ],
      documents: [],
      deliverable: "Working Build",
      duration: "Week 11",
      additionalInfo: [
        "Screenshot every compile step — capture terminal output showing successful build",
        "Store screenshots in /docs/build-logs/ folder",
      ],
    },
    {
      stepNumber: 6,
      title: "Execute & Test the Project",
      subtitle: "Run the application, conduct all testing, and store results",
      whatHappens: [
        "Unit Testing — test each function/module independently (use pytest, JUnit, Jest)",
        "Integration Testing — test how modules work together (API + database + frontend)",
        "System Testing — run end-to-end scenarios as a real user would",
        "UAT (User Acceptance Testing) — have 3-5 students use the system and collect feedback",
        "Bug fixing — fix all critical and major bugs found during testing, re-test",
      ],
      documents: [
        { code: "TC", title: "Test Case Document", description: "All test cases with pass/fail status (Excel or PDF format)" },
        { code: "SS", title: "Execution Screenshots", description: "Screenshots of each running module with output visible" },
        { code: "VD", title: "Screen Recording / Demo Video", description: "3-5 min walkthrough of all features" },
        { code: "UT", title: "Unit Test Report", description: "Auto-generated HTML report from testing framework" },
      ],
      deliverable: "Test Report + Screenshots",
      duration: "Week 12",
    },
    {
      stepNumber: 7,
      title: "Project Report Writing",
      subtitle: "Compile all work into a formal bound project report",
      whatHappens: [
        "Chapter 1 — Introduction: problem statement, objectives, scope, limitations, project organization",
        "Chapter 2 — Literature Review: existing systems, research papers, comparison with proposed system",
        "Chapter 3 — System Analysis: requirements, feasibility study (technical, economic, operational)",
        "Chapter 4 — System Design: architecture, DFD, ER diagram, UI wireframes",
        "Chapter 5 — Implementation: modules, code snippets, database tables, screenshots",
        "Chapter 6 — Testing: test plan, test cases, results, bug log",
        "Chapter 7 — Conclusion & Future Work: achievements, limitations, enhancements possible",
        "References & Appendices: bibliography (IEEE format), source code listing, user manual",
      ],
      documents: [],
      deliverable: "Bound Report (3 copies)",
      duration: "Week 13",
      additionalInfo: [
        "Use college-prescribed font (Times New Roman 12pt or Arial 11pt)",
        "1.5 line spacing, page numbers, header/footer with project title",
        "Get report approved by guide before printing",
      ],
    },
    {
      stepNumber: 8,
      title: "Demonstration to Class Teacher / Panel",
      subtitle: "Present and defend the project before evaluators",
      whatHappens: [
        "Prepare demo environment — ensure laptop, projector, internet (if needed), and backup USB are ready",
        "Prepare PPT presentation — cover: problem, solution, tech stack, architecture, modules, demo, future scope (15-20 slides)",
        "Live system demo — run the actual application, walk through all modules in order of user flow",
        "Individual Q&A — each team member must answer questions on their specific module",
        "Submit project to teacher — hand over bound report, CD/USB with source code, login credentials for demo",
        "Sign-off and marks — teacher/panel signs evaluation sheet, internal marks awarded",
      ],
      documents: [],
      deliverable: "Project Evaluated & Submitted",
      duration: "Week 14-15",
      additionalInfo: [
        "Know your project end-to-end — be ready for 'Why did you choose this technology?'",
        "Explain your ER diagram and which module you personally coded",
        "Demo fallback — have screenshots ready if live demo fails during evaluation",
        "Future enhancements — always have 2-3 ideas prepared for 'how would you improve this?'",
      ],
    },
  ],
};

export const nonTechStream: ProjectStream = {
  id: "non-tech",
  title: "Non-Tech Project Stream",
  subtitle: "Commerce / Arts / Management",
  stepsCount: 7,
  description: "Complete lifecycle of a non-technical college project in Commerce, Arts, Management, Social Science, or any research-based discipline. Follow all 7 steps including document scanning, upload, and validation procedures.",
  steps: [
    {
      stepNumber: 1,
      title: "Topic Selection & Research Proposal",
      subtitle: "Choose a relevant subject, define research questions and objectives",
      whatHappens: [
        "Identify area of study — pick a domain (marketing, economics, social issues, HR, law, education, environment)",
        "Define research question — e.g. 'Impact of digital payment on small business in Mumbai'",
        "Set objectives — 3-5 measurable goals your project will achieve",
        "Submit synopsis — a 2-3 page research proposal to your faculty guide for approval",
      ],
      documents: [
        { code: "SY", title: "Project Synopsis", description: "Topic, rationale, objectives, scope, methodology outline (2-3 pages)" },
        { code: "AP", title: "Approval Letter", description: "Signed by faculty guide and HOD" },
        { code: "TM", title: "Team Declaration", description: "Member names, roll numbers, and division of work" },
      ],
      deliverable: "Approved Synopsis",
      duration: "Week 1",
      additionalInfo: [
        "Scan all signed documents at 300 DPI minimum",
        "Save as PDF with naming: '01_Synopsis_[ProjectTitle].pdf'",
      ],
    },
    {
      stepNumber: 2,
      title: "Literature Review & Secondary Data Collection",
      subtitle: "Research existing work, gather secondary data from credible sources",
      whatHappens: [
        "Review published research — read at minimum 10 research papers / journal articles on your topic",
        "Collect secondary data — government reports, census data, company annual reports, RBI/SEBI data, WHO/UN data",
        "Note key theories — document relevant theoretical frameworks (Porter's 5 Forces, Maslow, SWOT etc.)",
        "Cite all sources — use APA 7th edition format for all references",
      ],
      documents: [
        { code: "LR", title: "Literature Review Write-up", description: "Summarize each paper: author, year, methodology, findings, relevance to your study" },
        { code: "DT", title: "Secondary Data Tables", description: "Tabulated data from government/industry sources with source URL noted" },
        { code: "RF", title: "Reference List", description: "Full bibliography in APA format" },
      ],
      deliverable: "Literature Review Chapter",
      duration: "Weeks 2-3",
    },
    {
      stepNumber: 3,
      title: "Research Methodology & Questionnaire Design",
      subtitle: "Design your data collection instrument and sampling plan",
      whatHappens: [
        "Choose research type — descriptive, exploratory, causal, or comparative study",
        "Choose data collection method — structured questionnaire, interview, observation, case study, focus group",
        "Define population & sample size — minimum 50 respondents for college projects; use random/stratified/convenience sampling",
        "Design questionnaire — 15-25 questions; mix of Likert scale (1-5), MCQ, and open-ended questions",
        "Pilot testing — test questionnaire with 5-10 people, refine unclear questions",
      ],
      documents: [
        { code: "QN", title: "Questionnaire (printed)", description: "Final version; get faculty approval. Scan signed copy and upload as PDF" },
        { code: "MC", title: "Methodology Chapter", description: "Research design, sampling plan, data collection process, tools used (SPSS/Excel/Google Forms)" },
        { code: "PT", title: "Pilot Test Report", description: "10 sample responses, feedback notes, changes made to questionnaire" },
      ],
      deliverable: "Approved Questionnaire",
      duration: "Week 4",
    },
    {
      stepNumber: 4,
      title: "Primary Data Collection",
      subtitle: "Collect responses through survey, interviews, or field observation",
      whatHappens: [
        "Distribute questionnaire — in-person (paper forms) OR online (Google Forms with QR code)",
        "Track responses — maintain a response log with date, location, and respondent demographic",
        "Interviews — if applicable, record interview (with consent), transcribe key points",
        "Field observation notes — document observations if visiting companies, markets, institutions",
        "Scan filled questionnaires — scan ALL paper forms and store digitally as evidence",
      ],
      documents: [
        { code: "RF", title: "Filled Response Forms", description: "All scanned questionnaires compiled in one PDF (Appendix A)" },
        { code: "RL", title: "Response Log Sheet", description: "Date, location, number of forms collected each day" },
        { code: "RD", title: "Raw Data Excel Sheet", description: "Data entry from all responses, one row per respondent" },
      ],
      deliverable: "Filled Forms + Raw Data",
      duration: "Weeks 5-8",
      additionalInfo: [
        "Use CamScanner or Adobe Scan app — scan each questionnaire at 200 DPI or higher",
        "Name files systematically: 'Resp_001.pdf', 'Resp_002.pdf'",
        "Combine into a single PDF using Adobe or SmallPDF",
        "Upload to college portal or shared drive; attach to project report as Appendix",
      ],
    },
    {
      stepNumber: 5,
      title: "Data Analysis & Result Interpretation",
      subtitle: "Apply statistical tools to draw meaningful insights from collected data",
      whatHappens: [
        "Data cleaning — remove incomplete/invalid responses, code categorical variables",
        "Descriptive statistics — frequency tables, mean, median, mode, standard deviation for each question",
        "Charts & graphs — bar chart, pie chart, line graph for each key variable using Excel or SPSS",
        "Cross-tabulation — compare responses across demographic groups (age, gender, income)",
        "Hypothesis testing — if applicable: Chi-square test, t-test, correlation, regression (SPSS output)",
        "Interpret findings — explain what each result means in the context of your research question",
      ],
      documents: [
        { code: "ST", title: "Statistical Output", description: "SPSS/Excel output tables with all computed values; paste into report" },
        { code: "CH", title: "Charts & Graphs", description: "Labeled, titled charts for each question; each chart followed by interpretation paragraph" },
        { code: "HT", title: "Hypothesis Test Results", description: "State H0, H1, test used, p-value, and conclusion (accept/reject H0)" },
      ],
      deliverable: "Analysis Chapter + Charts",
      duration: "Weeks 9-11",
    },
    {
      stepNumber: 6,
      title: "Project Report Writing & Document Compilation",
      subtitle: "Compile all research into a complete, formatted bound report",
      whatHappens: [
        "Front Matter — Title page, certificate (college signed), declaration, acknowledgement, abstract, table of contents, list of tables/figures",
        "Chapter 1 — Introduction: background, problem statement, objectives, hypotheses, scope & limitations",
        "Chapter 2 — Literature Review: review of past studies, research gap, theoretical framework",
        "Chapter 3 — Research Methodology: research design, sampling, tools used, questionnaire description",
        "Chapter 4 — Data Analysis: tables, charts, statistical results, interpretation of each question",
        "Chapter 5 — Findings, Conclusion & Recommendations: insights, conclusion, practical suggestions",
        "Bibliography — APA format references. Appendices — questionnaire copy, raw data, scanned forms",
      ],
      documents: [
        { code: "CC", title: "College Certificate", description: "Signed by guide and HOD; scan and insert as Page 3 of report PDF" },
        { code: "DL", title: "Student Declaration", description: "Signed by all team members; scan and insert after certificate" },
        { code: "SC", title: "All filled questionnaire scans", description: "Insert as Appendix A (merged PDF)" },
        { code: "VP", title: "Plagiarism Check Report", description: "Run Turnitin or Urkund; acceptable similarity below 20%" },
      ],
      deliverable: "Bound Report (3 copies)",
      duration: "Weeks 12-13",
      additionalInfo: [
        "Validation checklist: All objectives addressed, all hypotheses tested, findings match research questions",
        "References verified, plagiarism within limits, faculty guide has reviewed and approved",
      ],
    },
    {
      stepNumber: 7,
      title: "Project Presentation & Viva to Class Teacher",
      subtitle: "Present findings, submit all documents, and defend your research",
      whatHappens: [
        "PPT Presentation — 15-20 slides: title, objectives, methodology, data highlights (charts), key findings, conclusion, future scope",
        "Exhibit your charts — print key charts on A3 paper or show on screen; walk teacher through each finding",
        "Show evidence — have scanned questionnaires, raw data file, and statistical output ready to show",
        "Q&A session — be ready to explain: why this topic, your sampling method, how you validated results",
        "Submit final project — bound report + CD/USB with all digital files + scanned documents",
      ],
      documents: [
        { code: "FN", title: "Key Findings Summary", description: "Bullet points of top 5-8 insights drawn from analysis" },
      ],
      deliverable: "Fully Submitted & Evaluated",
      duration: "Week 14-15",
    },
  ],
};
