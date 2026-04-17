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
        "Identify stakeholders — who will use this system? (admin, candidate, teacher, public)",
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
        { code: "DL", title: "Candidate Declaration", description: "Signed by all team members; scan and insert after certificate" },
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

export const mbaCaseStudyStream: ProjectStream = {
  id: "mba-casestudy",
  title: "MBA Case Study Stream",
  subtitle: "CaseIQ — Business Analysis & Strategy",
  stepsCount: 10,
  description: "End-to-end lifecycle for MBA case study projects based on the CaseIQ platform. Covers case study assignment, team formation, research & AI-assisted analysis, collaborative report drafting, multi-format submission, peer review, rubric-based grading, presentation & pitch, portfolio building, and library archival.",
  steps: [
    {
      stepNumber: 1,
      title: "Case Study Assignment & Team Formation",
      subtitle: "Receive the case brief, form your team, and set up your workspace",
      whatHappens: [
        "Receive case study assignment notification — one-click deep link to your case study workspace",
        "Form your team (2–5 members) — drag-and-drop selection or auto-assignment by CGPA/profile balancing",
        "Assign team roles — Team Lead, Research Lead, Financial Analyst, Presentation Lead, Documentation Lead",
        "Read the case study brief and exhibits (PDFs, datasets, video links, financial exhibits) in the Case Brief Viewer",
        "Set up team workspace — persistent workspace with task board, discussion threads, and shared documents",
      ],
      documents: [
        { code: "CB", title: "Case Study Brief", description: "Full case study document with industry context, problem statement, exhibits, and deliverable expectations" },
        { code: "TF", title: "Team Formation Sheet", description: "Member names, roles, and responsibility assignments" },
        { code: "TP", title: "Task Plan (Kanban Board Export)", description: "Initial task allocation exported from team workspace" },
      ],
      deliverable: "Team Formed & Workspace Active",
      duration: "Week 1",
    },
    {
      stepNumber: 2,
      title: "Research & Framework Selection",
      subtitle: "Use AI Sidekick and management frameworks to structure your analysis",
      whatHappens: [
        "Use the AI Sidekick to brainstorm analytical frameworks — Porter's 5 Forces, SWOT, BCG Matrix, PESTLE, McKinsey 7S, etc.",
        "Access the built-in library of 50+ management frameworks with templates",
        "Conduct secondary research — access curated databases (EBSCO, Statista) via institutional SSO",
        "Review at least 5 published case studies or journal articles relevant to the industry/problem",
        "Define your analytical approach — which frameworks you will apply and why",
        "AI assistant helps validate your approach — but will NOT write content for you (guardrailed)",
      ],
      documents: [
        { code: "RF", title: "Research Notes & Sources", description: "Summary of key articles, data sources, and framework references with proper citations" },
        { code: "FA", title: "Framework Application Plan", description: "Which frameworks will be used, why they fit, and expected insights from each" },
        { code: "BG", title: "Bibliography (APA/Harvard)", description: "Formatted reference list of all sources consulted" },
      ],
      deliverable: "Research Dossier & Framework Plan",
      duration: "Week 2",
      additionalInfo: [
        "AI Sidekick suggestions are tagged 'AI Suggestion — For Reference Only' and logged for faculty review",
        "Citation manager auto-formats references in APA, MLA, or Harvard style",
      ],
    },
    {
      stepNumber: 3,
      title: "Collaborative Report Drafting",
      subtitle: "Write the case study analysis report collaboratively with your team",
      whatHappens: [
        "Use the real-time collaborative document editor (Google Docs-like) for joint report drafting",
        "Structure your report: Executive Summary, Industry Analysis, Problem Identification, Framework Application, Financial Analysis, Recommendations, Implementation Plan",
        "Track all changes with version history — every edit is logged with author and timestamp",
        "Use inline comments and threaded discussions for team coordination",
        "Apply data visualization — charts, tables, and financial models to support your analysis",
        "Run plagiarism check (Turnitin integration) before submission — aim for similarity below 15%",
      ],
      documents: [
        { code: "DR", title: "Draft Report (PDF)", description: "Complete case study analysis report with all sections, charts, and references" },
        { code: "FM", title: "Financial Model (Excel)", description: "Spreadsheet with financial projections, sensitivity analysis, or valuation models" },
        { code: "VH", title: "Version History Log", description: "Export of document version history showing team contributions" },
      ],
      deliverable: "Complete Draft Report",
      duration: "Weeks 3–5",
      additionalInfo: [
        "Each team member's contribution is tracked via the team activity log visible to faculty",
        "Use the task board to assign report sections to individual members",
      ],
    },
    {
      stepNumber: 4,
      title: "Multi-Format Submission",
      subtitle: "Submit your report, presentation deck, financial model, and video pitch",
      whatHappens: [
        "Prepare all submission components: PDF report, PowerPoint deck, Excel financial model, and video pitch (max 10 min)",
        "Upload through the Submission Portal — each file type has a clear upload slot with format validation",
        "System enforces file size limits, format validation, and deadline locks",
        "Late submission policy: configurable grace period with automatic penalty application",
        "Receive submission confirmation with unique submission ID and timestamp for audit",
        "Faculty can configure whether peer review must be completed before final submission is unlocked",
      ],
      documents: [
        { code: "FR", title: "Final Report (PDF)", description: "Polished case study analysis report — formatted, proofread, and plagiarism-checked" },
        { code: "PD", title: "Presentation Deck (PPTX)", description: "15–20 slides covering problem, analysis, frameworks, findings, and recommendations" },
        { code: "FX", title: "Financial Model (XLSX)", description: "Excel workbook with financial analysis, projections, and supporting calculations" },
        { code: "VP", title: "Video Pitch (MP4)", description: "3–10 minute recorded pitch summarizing key findings and recommendations" },
      ],
      deliverable: "All Files Submitted",
      duration: "Week 6",
      additionalInfo: [
        "Plagiarism report is auto-generated and attached to submission record",
        "Submission portal shows checklist UI — green tick for each uploaded component",
      ],
    },
    {
      stepNumber: 5,
      title: "Peer Review",
      subtitle: "Review another team's submission using structured evaluation forms",
      whatHappens: [
        "Assigned to review another team's submission (anonymous — reviewer identity hidden)",
        "Complete structured peer review form with Likert-scale ratings (1–5) across criteria",
        "Provide open-ended feedback on strengths, weaknesses, and improvement suggestions",
        "Peer review scores contribute to final grade with configurable weighting (10–20%)",
        "If configured, complete a second review round incorporating feedback from Round 1",
        "Candidates can respond to peer reviews via a structured rebuttal mechanism",
      ],
      documents: [
        { code: "PR", title: "Peer Review Form (Completed)", description: "Structured evaluation with Likert scores and written feedback for the reviewed team" },
        { code: "RB", title: "Rebuttal Response (if applicable)", description: "Your team's response to peer review feedback received" },
      ],
      deliverable: "Peer Review Submitted",
      duration: "Week 7",
    },
    {
      stepNumber: 6,
      title: "Rubric-Based Faculty Grading",
      subtitle: "Faculty evaluates submissions using custom rubrics with weighted criteria",
      whatHappens: [
        "Faculty grades using custom rubric with weighted criteria (e.g., Analysis 40%, Presentation 30%, Innovation 30%)",
        "Blind grading option — submissions anonymized before assignment to graders",
        "Inline annotation tools on PDFs and slide decks — highlights, sticky notes, text comments",
        "Multi-evaluator support: primary grader scores → moderator reviews → escalation if delta > 15%",
        "Structured feedback form mapped to each rubric criterion",
        "Grade calculation: weighted rubric scores + peer review component + presentation score",
      ],
      documents: [],
      deliverable: "Faculty Grade & Feedback",
      duration: "Week 8",
      additionalInfo: [
        "Grade release is controlled — faculty holds grades until review is complete",
        "Candidates can raise a grade appeal within 5 days of release",
        "Grades can be exported to CSV, Excel, or pushed to LMS via API",
      ],
    },
    {
      stepNumber: 7,
      title: "View Feedback & Grade",
      subtitle: "Review faculty feedback, rubric scores, and comparison with cohort",
      whatHappens: [
        "View detailed rubric-based feedback — each criterion scored with specific comments",
        "See inline annotations on your submitted PDF and deck",
        "Compare your score with anonymized cohort average",
        "Review peer feedback received from reviewing teams",
        "Identify improvement areas for future case studies based on criterion-level scores",
      ],
      documents: [
        { code: "GR", title: "Grade Report", description: "Rubric breakdown with criterion scores, weights, and final grade" },
        { code: "AF", title: "Annotated Report (PDF)", description: "Your submitted report with faculty inline annotations and comments" },
      ],
      deliverable: "Feedback Reviewed",
      duration: "Week 9",
    },
    {
      stepNumber: 8,
      title: "Presentation & Jury Scoring",
      subtitle: "Present your case study analysis to a faculty and industry jury panel",
      whatHappens: [
        "Schedule your presentation slot via the integrated calendar booking system",
        "Prepare 15–20 minute presentation: problem context, methodology, key analysis, financial model walkthrough, recommendations",
        "Present to jury panel (faculty + invited industry guests) in timed sessions",
        "Jury scores presentations in real-time via mobile-friendly scoring dashboard",
        "Automated averaging and weighting of jury scores applied to final grade",
        "Session recording linked to your submission record for future reference",
      ],
      documents: [
        { code: "FP", title: "Final Presentation Deck", description: "Polished deck used during jury presentation with speaker notes" },
        { code: "JS", title: "Jury Score Sheet", description: "Aggregated jury scores across evaluation criteria" },
      ],
      deliverable: "Presentation Evaluated",
      duration: "Week 10",
      additionalInfo: [
        "Practice your timing — strict time limits enforced with presenter queue management",
        "Each team member should present their assigned section and answer questions individually",
        "Have backup screenshots ready in case of live demo or display issues",
      ],
    },
    {
      stepNumber: 9,
      title: "Portfolio Building & Export",
      subtitle: "Export your case study to a personal portfolio for career readiness",
      whatHappens: [
        "One-click export of your submission to a personal portfolio with auto-generated PDF portfolio card",
        "Portfolio includes: executive summary, key analysis highlights, grade achieved, and faculty comments",
        "Build a collection of all case studies completed throughout the MBA program",
        "Portfolio is shareable with recruiters as proof of analytical and strategic competency",
        "Track download and citation metrics for your portfolio entries",
      ],
      documents: [
        { code: "PC", title: "Portfolio Card (PDF)", description: "Auto-generated one-page summary card with case study highlights and grade" },
        { code: "PL", title: "Portfolio Link", description: "Shareable URL to your curated case study portfolio" },
      ],
      deliverable: "Portfolio Updated",
      duration: "Week 11",
    },
    {
      stepNumber: 10,
      title: "Case Study Library Archival",
      subtitle: "Approved submissions archived in the institutional case study library",
      whatHappens: [
        "Provide consent for your submission to be added to the institutional case study library",
        "Faculty/Program Director reviews and approves submission for library inclusion",
        "Submission tagged by industry, function (Finance, Marketing, Strategy, Operations), and difficulty level",
        "Library entry includes full-text search, download tracking, and citation count",
        "'Best in Class' showcase — top submissions curated annually by Program Director",
      ],
      documents: [
        { code: "CF", title: "Consent Form", description: "Signed consent for library publication of your case study" },
        { code: "LB", title: "Library Entry Confirmation", description: "Confirmation of submission archival with library reference number" },
      ],
      deliverable: "Archived in Library",
      duration: "Week 12",
      additionalInfo: [
        "Library entries are searchable by year, industry, faculty rating, and learning objectives",
        "High-performing submissions may be featured in the 'Best in Class' annual showcase",
      ],
    },
  ],
};
