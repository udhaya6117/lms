const Course = require('../models/Course');
const Section = require('../models/Section');
const Lesson = require('../models/Lesson');
const Assignment = require('../models/Assignment');

const COURSE_DOCS = {
  'Introduction to React': [
    {
      section: 'Section 1 — Foundations',
      title: 'Components and JSX',
      content:
        'Start here. A React component is a function that returns UI. JSX looks like HTML, but it compiles to JavaScript. Read this note, then complete the weekly practical by describing a small component you would build.',
    },
    {
      section: 'Section 2 — Data & APIs',
      title: 'Hooks and fetching data',
      content:
        'useState holds local values. useEffect runs after render so you can load course data from the API. Show loading and error states. Use these notes when you write the checkpoint assignment.',
    },
  ],
  'Advanced React Patterns': [
    {
      section: 'Section 1 — Patterns',
      title: 'Context and composition',
      content:
        'Context shares auth and theme without passing props through every parent. Prefer composition when only a few children need the value. Read this before the weekly practical.',
    },
    {
      section: 'Section 2 — Performance',
      title: 'Memoization in real apps',
      content:
        'useMemo and React.memo help only when a render is expensive and props are stable. Measure first. Use this note for the checkpoint write-up.',
    },
  ],
  'Node.js API Design': [
    {
      section: 'Section 1 — Express basics',
      title: 'Routes and middleware order',
      content:
        'A request hits authenticate, then authorize, then validate, then the controller. Keep handlers thin. Read this before you write the weekly practical.',
    },
    {
      section: 'Section 2 — Access control',
      title: 'Roles on the API',
      content:
        'Students, trainers, and admins must be checked on the server, not only in the UI. Describe one 403 case in the checkpoint assignment.',
    },
  ],
  'MongoDB for Educators': [
    {
      section: 'Section 1 — Documents',
      title: 'Modeling courses and enrollments',
      content:
        'A course document stores title, trainer, and status. Enrollment is a unique pair of course + student. Read this, then explain that model in the weekly practical.',
    },
    {
      section: 'Section 2 — Queries',
      title: 'Indexes you will use',
      content:
        'Index course + student for enrollments and course + dueDate for assignments. Use this note when you write the checkpoint.',
    },
  ],
  'UI Engineering': [
    {
      section: 'Section 1 — Layout',
      title: 'Accessible course pages',
      content:
        'Cards, labels, and focus states help every learner. Keep contrast high and targets large. Read this before the weekly practical.',
    },
    {
      section: 'Section 2 — State',
      title: 'Forms and feedback',
      content:
        'Show errors next to the field and confirm success after save. Use these notes for the checkpoint write-up.',
    },
  ],
  'Python for Data': [
    {
      section: 'Section 1 — Wrangling',
      title: 'Cleaning marks data',
      content:
        'Load a table of submissions, drop empty rows, and compute a mean. Read this before the weekly practical.',
    },
    {
      section: 'Section 2 — Reporting',
      title: 'Simple charts for faculty',
      content:
        'A bar of submitted vs evaluated work is enough for a first dashboard. Use this note in the checkpoint.',
    },
  ],
  'Cloud Fundamentals': [
    {
      section: 'Section 1 — Deploy',
      title: 'Env, health, and process',
      content:
        'The API needs a Mongo URI, a port, and a /api/health route. Read this before the weekly practical.',
    },
    {
      section: 'Section 2 — Config',
      title: 'Secrets stay off the client',
      content:
        'Never put database passwords in the React app. Describe one leak you would block in the checkpoint.',
    },
  ],
  'Cybersecurity Basics': [
    {
      section: 'Section 1 — Auth threats',
      title: 'Tokens and sessions',
      content:
        'Access tokens are short-lived. Refresh cookies are httpOnly. Read this before the weekly practical.',
    },
    {
      section: 'Section 2 — OWASP',
      title: 'Broken access control',
      content:
        'A student must not grade work or edit another trainer’s course. Use this note for the checkpoint.',
    },
  ],
  'SQL and Reporting': [
    {
      section: 'Section 1 — Tables',
      title: 'Courses, students, marks',
      content:
        'One student can enroll in many courses. One assignment has many submissions. Read this before the weekly practical.',
    },
    {
      section: 'Section 2 — Dashboards',
      title: 'Queries faculty ask for',
      content:
        'Count late work, average marks, and pending evaluations. Use this note in the checkpoint.',
    },
  ],
  'Mobile App Foundations': [
    {
      section: 'Section 1 — Screens',
      title: 'Course list on a phone',
      content:
        'Show title, trainer, and enroll status. Keep tap targets large. Read this before the weekly practical.',
    },
    {
      section: 'Section 2 — Offline',
      title: 'Saving a draft answer',
      content:
        'A student may type an assignment offline and submit later. Describe that flow in the checkpoint.',
    },
  ],
  'Product Design for LMS': [
    {
      section: 'Section 1 — Flows',
      title: 'Enroll, learn, submit',
      content:
        'The happy path is catalog → enroll → study document → assignment. Read this before the weekly practical.',
    },
    {
      section: 'Section 2 — Evaluation',
      title: 'Marks and feedback',
      content:
        'Trainers need a short queue: waiting papers, then marks plus a comment. Use this note for the checkpoint.',
    },
  ],
  'DevOps for Faculty Tools': [
    {
      section: 'Section 1 — CI',
      title: 'Test before you ship',
      content:
        'A failing assignment API test should block deploy. Read this before the weekly practical.',
    },
    {
      section: 'Section 2 — Logs',
      title: 'What to watch in production',
      content:
        'Log 401s, 403s, and enroll conflicts. Explain one alert in the checkpoint.',
    },
  ],
  'English for Technical Writing': [
    {
      section: 'Section 1 — Briefs',
      title: 'Write a clear assignment',
      content:
        'State the task, the evidence you want, and the due date. Read this before the weekly practical.',
    },
    {
      section: 'Section 2 — Feedback',
      title: 'Comments students can use',
      content:
        'Name what worked, then one change for next time. Use this note in the checkpoint.',
    },
  ],
  'Statistics for Assessment': [
    {
      section: 'Section 1 — Marks',
      title: 'Fair scoring basics',
      content:
        'Marks stay inside 0 to maxMarks. A missing paper is not a zero until policy says so. Read this before the weekly practical.',
    },
    {
      section: 'Section 2 — Spread',
      title: 'Reading a cohort',
      content:
        'Look at mean, range, and how many papers are still waiting. Use this note for the checkpoint.',
    },
  ],
  'Full-Stack Capstone': [
    {
      section: 'Section 1 — Scope',
      title: 'What the team will ship',
      content:
        'Pick one LMS slice: enroll, study documents, or evaluation. Write the user, the API, and the page. This is the Section 1 document reviewers need before they approve the course.',
    },
  ],
  'TypeScript in Teams': [
    {
      section: 'Section 1 — Types',
      title: 'Typing the course API',
      content:
        'A Course type needs title, status, and trainer. Do not use any for those fields. Read this before the weekly practical.',
    },
    {
      section: 'Section 2 — Safety',
      title: 'Catching broken payloads',
      content:
        'If dueDate is missing, the compile should fail before the form ships. Use this note in the checkpoint.',
    },
  ],
  'Wrench Wise — Assignment Walkthrough': [
    {
      section: 'Section 1 — Authorization',
      title: 'Who can change what',
      content:
        'Trainers edit only their own courses. Students submit only after they enroll. Admins approve drafts. Read this before the graded authorization practical.',
    },
    {
      section: 'Section 2 — Enrollment rules',
      title: 'One seat per student',
      content:
        'Enrollment is unique for { course, student }. A second enroll returns 409. Another student can still join. Use this note for the waiting-for-marks paper.',
    },
    {
      section: 'Section 3 — Your submission',
      title: 'How to turn work in',
      content:
        'Open the assignment, write at least 10 characters, and submit once. A second submit is rejected. Read this before “Your turn”.',
    },
    {
      section: 'Section 4 — Late work',
      title: 'Due dates are enforced',
      content:
        'When the due date has passed, the form is blocked and the API returns 400. Late work is never accepted. Read this before you open the overdue assignment.',
    },
  ],
  'Study Path Check': [
    {
      section: 'Section 1',
      title: 'Intro study notes',
      content:
        'Read these notes first. They explain the basics students need before the assignment.',
    },
    {
      section: 'Section 2',
      title: 'Section 2 practice notes',
      content:
        'These extra notes were added after approval and should appear to students immediately.',
    },
  ],
};

const fallbackDocs = (course) => {
  const docs = [
    {
      section: 'Section 1',
      title: `${course.title} — Start here`,
      content: `${course.description} Read this study document first. Then open the assignment for Section 1 and answer from these notes.`,
    },
  ];
  if (course.status === 'PUBLISHED' || course.isPublished) {
    docs.push({
      section: 'Section 2',
      title: `${course.title} — Practice notes`,
      content: `Apply what you read in Section 1. Use this second document when you write the checkpoint or follow-up assignment for this course.`,
    });
  }
  return docs;
};

async function ensureCourseStudyDocs(course) {
  const planned = COURSE_DOCS[course.title] || fallbackDocs(course);
  const existing = await Section.find({ course: course._id }).sort({ order: 1, createdAt: 1 });
  const sections = [...existing];

  for (let i = 0; i < planned.length; i += 1) {
    const plan = planned[i];
    let section = sections[i];
    if (!section) {
      section = await Section.create({
        course: course._id,
        title: plan.section,
        order: i + 1,
      });
      sections.push(section);
    }
    const lessonCount = await Lesson.countDocuments({ section: section._id });
    if (!lessonCount) {
      await Lesson.create({
        course: course._id,
        section: section._id,
        title: plan.title,
        type: 'TEXT',
        content: plan.content,
        order: 1,
      });
    }
  }

  const stop = new Set(['section', 'your', 'what', 'that', 'this', 'with', 'from', 'notes', 'here', 'start', 'work']);
  const matchSection = (assignment) => {
    const hay = `${assignment.title} ${assignment.description}`.toLowerCase();
    let best = null;
    let bestScore = 0;
    for (const section of sections) {
      const label = section.title.toLowerCase().replace(/^section\s+\d+\s*[—-]\s*/, '');
      const tokens = label.split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !stop.has(w));
      const hits = tokens.filter((w) => hay.includes(w)).length;
      if (hits > bestScore) {
        bestScore = hits;
        best = section;
      }
    }
    return bestScore > 0 ? best : null;
  };

  const assignments = await Assignment.find({ course: course._id }).sort({ createdAt: 1 });
  for (let i = 0; i < assignments.length; i += 1) {
    const section = matchSection(assignments[i]) || sections[Math.min(i, sections.length - 1)];
    if (!section) continue;
    if (String(assignments[i].section || '') === String(section._id)) continue;
    assignments[i].section = section._id;
    await assignments[i].save();
  }

  return sections.length;
}

async function ensureAllCourseStudyDocs() {
  const courses = await Course.find().sort({ createdAt: 1 });
  let touched = 0;
  for (const course of courses) {
    touched += await ensureCourseStudyDocs(course);
  }
  return { courses: courses.length, sections: touched };
}

module.exports = { ensureCourseStudyDocs, ensureAllCourseStudyDocs };
