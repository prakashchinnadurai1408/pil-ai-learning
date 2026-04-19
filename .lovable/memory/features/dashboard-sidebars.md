---
name: Dashboard sidebars
description: All three role dashboards use shadcn Sidebar with grouped sections instead of top tabs
type: design
---
- AdminDashboard groups: Overview, Manage (Users, Subscriptions, Learning Paths), Content (Modules, Section Content, Question Bank, Coding, Assessments), Analytics (Assessments, Proctoring, Projects, LLM Usage), System (LLM Settings).
- StudentDashboard groups: Account (Overview, Subscriptions Status), Learn (Learning Paths, Module Groups, Modules & Videos), Practice (Section Content – AI Chat, Section Content – AI Tools, Question Bank, Coding Challenges, Prompts), Assessments (Assessments, Projects), Analytics (Assessments, Proctoring, Projects). Locked items show a lock icon and trigger upgrade dialog. The standalone Videos sidebar item was removed — videos live inside each module.
- TrainerDashboard groups: Students (Student Progress), Assessments (Overview, Create), Analytics (Assessments, Modules, Coding), Reviews (Projects).
- All use `collapsible="icon"` with `SidebarTrigger` in the sticky header.
- Menu visibility per tier is controlled via `menu_access_controls` table (audience='student'|'trainer', tiers: free/beginner/advanced/enterprise) and resolved through `useMenuAccessControls` + `isAllowed()`.
