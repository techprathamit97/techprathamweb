// "use client";

// import { useState, useEffect } from "react";
// import { ChevronDown } from "lucide-react";
// /* ---------- HELPERS ---------- */
// function getCourseTitle(courseId) {
//   return courseId?.replace(/-/g, " ") || "";
// }

// function normalizeSlug(link) {
//   if (!link) return null;
//   let cleaned = link.replace(/^\/+/, "");
//   if (cleaned.includes("/")) cleaned = cleaned.split("/").pop();
//   return cleaned;
// }

// /* ---------- RESOLVERS ---------- */
// function resolveLesson(item) {
//   return {
//     title: item.title || "Untitled Lesson",
//     slug: item.slug || normalizeSlug(item.link)
//   };
// }

// function resolveSection(section) {
//   return {
//     title: section.title || "Untitled Section",
//     slug: section.slug || normalizeSlug(section.link)
//   };
// }

// function resolveSubSection(sub) {
//   return {
//     title: sub.title || "Untitled Subsection",
//     slug: sub.slug || normalizeSlug(sub.link)
//   };
// }

// /* ---------- PROGRESS HELPERS ---------- */
// function getProgress(courseId) {
//   return JSON.parse(localStorage.getItem(`course-progress-${courseId}`) || "{}");
// }

// function getScroll(courseId) {
//   return JSON.parse(localStorage.getItem(`course-scroll-${courseId}`) || "{}");
// }

// function getLessonPercent(courseId, lessonSlug) {
//   const scroll = getScroll(courseId);
//   const progress = getProgress(courseId);

//   if (scroll[lessonSlug] != null) return scroll[lessonSlug];
//   if (progress[lessonSlug]) return 100;
//   return 0;
// }

// function getCoursePercent(courseId, items) {
//   if (!items.length) return 0;

//   let sum = 0;
//   items.forEach((item) => {
//     const slug = item.slug || normalizeSlug(item.link);
//     sum += getLessonPercent(courseId, slug);
//   });

//   return Math.round(sum / items.length);
// }

// /* ---------- BADGE ---------- */
// function LessonProgressBadge({ percent, isCompleted }) {
//   if (isCompleted) {
//     return (
//       <div className="w-5 h-5 rounded-full text-white text-xs flex items-start justify-end font-semibold bg-[linear-gradient(180deg,#4b1907,#f71e1e)]">
//         ✓
//       </div>
//     );
//   }

//   const pct = Math.max(0, Math.min(100, Math.round(percent)));

//   return (
//     <div className="relative w-5 h-5">
//       <div
//         className="w-full h-full rounded-full"
//         style={{
//           background: `conic-gradient(#f71e1e ${pct}%, #e5e7eb ${pct}%)`
//         }}
//       />
//       <div className="absolute inset-[3px] bg-white rounded-full" />
//     </div>
//   );
// }

// /* ---------- COMPONENT ---------- */
// export default function CourseSidebar({
//   items = [],
//   onSelect,
//   activeLesson,
//   activeSection,
//   activeSubSection,
//   courseId,
//   isOpen,
//   onClose
// }) {
//   const coursePercent = getCoursePercent(courseId, items);
//   const [openSections, setOpenSections] = useState({});
//   const [openLessons, setOpenLessons] = useState({});
//   useEffect(() => {
//     if (activeLesson) {
//       setOpenLessons((prev) => ({
//         ...prev,
//         [activeLesson]: true
//       }));
//     }

//     if (activeSection) {
//       setOpenSections((prev) => ({
//         ...prev,
//         [activeSection]: true
//       }));
//     }
//   }, [activeLesson, activeSection, activeSubSection]);



//   return (
//     <>
//       {isOpen && (
//         <div
//           onClick={onClose}
//           className="fixed inset-0 bg-black/40 z-[20]"
//         />
//       )}

//       <aside
//         className={`course-sidebar w-[270px] h-screen fixed top-0 overflow-y-auto bg-white border-r border-[#eee] transition-all duration-300 z-[30] ${isOpen ? "left-0" : "-left-[260px]"
//           }`}
//       >
//         {/* HEADER */}
//         <div className="text-white p-[10px] bg-[linear-gradient(180deg,#7a1c00,#e31818)]">
//           <h2 className="m-0 text-[20px] capitalize">
//             {getCourseTitle(courseId)}
//           </h2>

//           <div className="mt-2">
//             <div className="text-xs mb-1">
//               {coursePercent}% COMPLETE
//             </div>

//             <div className="w-full h-[6px] rounded bg-white/30">
//               <div
//                 className="h-full bg-white rounded"
//                 style={{ width: `${coursePercent}%` }}
//               />
//             </div>
//           </div>
//         </div>

//         {/* LESSON LIST */}
//         <div className="p-2">
//           {items.map((item) => {
//             const lesson = resolveLesson(item);
//             const isActive = lesson.slug === activeLesson;
//             const sections = item.sections || [];
//             const percent = getLessonPercent(courseId, lesson.slug);

//             return (
//               <div key={lesson.slug} className="mb-1">
//                 <button
//                   onClick={() => {
//                     if (sections.length > 0) {
//                       setOpenLessons((prev) => ({
//                         ...prev,
//                         [lesson.slug]: !prev[lesson.slug]
//                       }));
//                     }

//                     onSelect({
//                       lesson: lesson.slug,
//                       section: null,
//                       subSection: null
//                     });
//                   }}

//                   className={`w-full py-1 rounded-[9px] border-0 cursor-pointer ${isActive ? "bg-gray-200" : "bg-transparent"
//                     }`}
//                 >
//                   <div className="flex items-start justify-between gap-2 w-full">
//                     {/* LEFT SIDE */}
//                     <div className="flex items-start gap-2 flex-1">
//                       <LessonProgressBadge
//                         percent={percent}
//                         isCompleted={percent >= 95}
//                       />

//                       <span className="text-sm font-semibold flex-1 text-left leading-[1.3]">
//                         {lesson.title}
//                       </span>
//                     </div>

//                     {/* RIGHT ARROW ONLY IF SECTIONS EXIST */}
//                     {sections.length > 0 && (
//                       <ChevronDown
//                         size={18}
//                         className="transition-all duration-200"
//                         style={{
//                           transform: openLessons?.[lesson.slug]
//                             ? "rotate(180deg)"
//                             : "rotate(0deg)"
//                         }}
//                       />
//                     )}
//                   </div>

//                 </button>

//                 {openLessons?.[lesson.slug] && (
//                   <div className="pl-6 py-2">
//                     {sections.map((section) => {
//                       const sec = resolveSection(section);
//                       const isOpen = openSections[sec.slug];
//                       const subSections = section.subSections || [];
//                       const isActiveSection = sec.slug === activeSection;
//                       console.log("Section slug:", sec.slug, "ActiveSection:", activeSection, "isActive:", isActiveSection);

//                       return (
//                         <div key={sec.slug}>
//                           {/* ROW */}
//                           <button
//                             onClick={() => {
//                               if (subSections.length > 0) {
//                                 setOpenSections((prev) => ({
//                                   ...prev, // ⭐ keep previously opened sections
//                                   [sec.slug]: !prev[sec.slug]
//                                 }));
//                               }

//                               onSelect({
//                                 lesson: lesson.slug,
//                                 section: sec.slug,
//                                 subSection: null
//                               });
//                             }}

//                             className={`flex items-start justify-between w-full py-1 gap-[8px] text-[15px] border-0 cursor-pointer text-left rounded-md ${isActiveSection ? "bg-gray-200" : "bg-transparent"
//                               }`}

//                           >
//                             {/* LEFT TITLE */}
//                             <span className="font-serif leading-[1.3] flex-1 flex items-start gap-2">
//                               <span className="mt-[6px] w-[4px] h-[4px] rounded-full bg-black shrink-0"></span>
//                               {sec.title}
//                             </span>

//                             {/* RIGHT ARROW ONLY IF SUBSECTIONS EXIST */}
//                             {subSections.length > 0 && (
//                               <ChevronDown
//                                 size={18}
//                                 className="transition-all duration-200"
//                                 style={{
//                                   transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
//                                 }}
//                               />
//                             )}

//                           </button>

//                           {/* SUB SECTIONS */}
//                           {isOpen && subSections.length > 0 && (
//                             <div className="pl-[12px]">
//                               {subSections.map((sub) => {
//                                 const ss = resolveSubSection(sub);
//                                 const isActiveSub = ss.slug === activeSubSection;
//                                  console.log("Subsection slug:", ss.slug, "ActiveSubSection:", activeSubSection, "isActive:", isActiveSub);
//                                 return (
//                                   <button
//                                     key={ss.slug}
//                                     onClick={() =>
//                                       onSelect({
//                                         lesson: lesson.slug,
//                                         section: sec.slug,
//                                         subSection: ss.slug
//                                       })
//                                     }
//                                     className={`border-0 cursor-pointer text-[13px] mt-1 flex items-start gap-2 text-left w-full rounded-md ${isActiveSub ? "bg-gray-100" : "bg-transparent"
//                                       }`}

//                                   >
//                                     <span className="mt-[6px] w-[4px] h-[4px] rounded-full bg-black shrink-0"></span>
//                                     <span className="leading-[1.3]">{ss.title}</span>
//                                   </button>

//                                 );
//                               })}
//                             </div>
//                           )}
//                         </div>

//                       );
//                     })}
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       </aside>

//       <style>{`
//         @media (min-width: 769px) {
//           .course-sidebar {
//             position: sticky !important;
//             left: 0 !important;
//           }
//         }
//       `}</style>
//     </>
//   );
// }




"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

/* ---------- HELPERS ---------- */
function getCourseTitle(courseId) {
  return courseId?.replace(/-/g, " ") || "";
}

function normalizeSlug(link) {
  if (!link) return null;
  let cleaned = link.replace(/^\/+/, "");
  if (cleaned.includes("/")) cleaned = cleaned.split("/").pop();
  return cleaned;
}

/* ---------- RESOLVERS ---------- */
function resolveLesson(item) {
  return {
    title: item.title || "Untitled Lesson",
    slug: item.slug || normalizeSlug(item.link)
  };
}

function resolveSection(section) {
  return {
    title: section.title || "Untitled Section",
    slug: section.slug || normalizeSlug(section.link)
  };
}

function resolveSubSection(sub) {
  return {
    title: sub.title || "Untitled Subsection",
    slug: sub.slug || normalizeSlug(sub.link)
  };
}

/* ---------- PROGRESS HELPERS ---------- */
function getProgress(courseId) {
  return JSON.parse(localStorage.getItem(`course-progress-${courseId}`) || "{}");
}

function getScroll(courseId) {
  return JSON.parse(localStorage.getItem(`course-scroll-${courseId}`) || "{}");
}

function getLessonPercent(courseId, lessonSlug) {
  const scroll = getScroll(courseId);
  const progress = getProgress(courseId);

  if (scroll[lessonSlug] != null) return scroll[lessonSlug];
  if (progress[lessonSlug]) return 100;
  return 0;
}

function getCoursePercent(courseId, items) {
  if (!items.length) return 0;

  let sum = 0;
  items.forEach((item) => {
    const slug = item.slug || normalizeSlug(item.link);
    sum += getLessonPercent(courseId, slug);
  });

  return Math.round(sum / items.length);
}

/* ---------- BADGE ---------- */
function LessonProgressBadge({ percent, isCompleted }) {
  if (isCompleted) {
    return (
      <div className="w-5 h-5 rounded-full text-white text-xs flex items-start justify-end font-semibold bg-[linear-gradient(180deg,#4b1907,#f71e1e)]">
        ✓
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className="relative w-5 h-5">
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `conic-gradient(#f71e1e ${pct}%, #e5e7eb ${pct}%)`
        }}
      />
      <div className="absolute inset-[3px] bg-gradient-to-tl from-[#C6151D] to-[#600A0E] rounded-full" />
    </div>
  );
}


/* ---------- COMPONENT ---------- */
export default function CourseSidebar({
  onSelect,
  activeLesson,
  activeSection,
  activeSubSection,
  courseId,
  isOpen,
  onClose
}) {
  const [lessons, setLessons] = useState([]);
  const [sectionsMap, setSectionsMap] = useState({});
  const [subSectionsMap, setSubSectionsMap] = useState({});
  const [openSections, setOpenSections] = useState({});
  const [openLessons, setOpenLessons] = useState({});

  const coursePercent = getCoursePercent(courseId, lessons);

  /* ---------- FETCH LESSONS ---------- */
  useEffect(() => {
    const fetchLessons = async () => {
      const res = await fetch(`/api/lms/sidebar?courseId=${courseId}`);
      const data = await res.json();
      setLessons(data);
    };

    if (courseId) fetchLessons();
  }, [courseId]);

  /* ---------- AUTO OPEN ACTIVE ---------- */
  useEffect(() => {
    if (activeLesson) {
      setOpenLessons((prev) => ({
        ...prev,
        [activeLesson]: true
      }));
    }

    if (activeSection) {
      setOpenSections((prev) => ({
        ...prev,
        [activeSection]: true
      }));
    }
  }, [activeLesson, activeSection, activeSubSection]);

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-[20]"
        />
      )}

      <aside
        className={`course-sidebar w-[270px] h-screen fixed top-0 overflow-y-auto bg-yellow-700 border-r border-[#eee] transition-all duration-300 z-[30] ${isOpen ? "left-0" : "-left-[260px]"
          }`}
      >
        {/* HEADER */}
        <div className="text-white p-[10px] bg-[linear-gradient(180deg,#7a1c00,#e31818)]">
          <h2 className="m-0 text-[20px] capitalize">
            {getCourseTitle(courseId)}
          </h2>

          <div className="mt-2">
            <div className="text-xs mb-1">
              {coursePercent}% COMPLETE
            </div>

            <div className="w-full h-[6px] rounded bg-white/30">
              <div
                className="h-full bg-green-800 rounded"
                style={{ width: `${coursePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* LESSON LIST */}
        <div className="p-2">
          {lessons.map((item) => {
            const lesson = resolveLesson(item);
            const isActive = lesson.slug === activeLesson;
            const sections = sectionsMap[lesson.slug] || [];
            const percent = getLessonPercent(courseId, lesson.slug);

            return (
              <div key={lesson.slug} className="mb-1">
                <button
                  onClick={async () => {

                    if (!sectionsMap[lesson.slug]) {
                      const res = await fetch(
                        `/api/lms/sidebar?courseId=${courseId}&lessonId=${lesson.slug}`
                      );
                      const data = await res.json();

                      setSectionsMap(prev => ({
                        ...prev,
                        [lesson.slug]: data
                      }));
                    }

                    setOpenLessons((prev) => ({
                      ...prev,
                      [lesson.slug]: !prev[lesson.slug]
                    }));

                    onSelect({
                      lesson: lesson.slug,
                      section: null,
                      subSection: null
                    });
                  }}
                  className={`w-full py-1 rounded-[9px] border-0 cursor-pointer 
                    }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex items-center gap-2 flex-1">
                      <LessonProgressBadge
                        percent={percent}
                        isCompleted={percent >= 95}
                      />

                      <span
                        className={`text-sm p-1 rounded-lg text-white border border-black flex-1 text-left leading-[1.3]
  ${isActive
                            ? "bg-black/30"
                            : "bg-gradient-to-tl from-[#C6151D] to-[#600A0E]"
                          }`}
                      >
                        {lesson.title}
                      </span>
                    </div>

                    {sections.length > 0 && (
                      <ChevronDown
                        size={18}
                        className="transition-all duration-200"
                        style={{
                          transform: openLessons?.[lesson.slug]
                            ? "rotate(180deg)"
                            : "rotate(0deg)"
                        }}
                      />
                    )}
                  </div>
                </button>

                {openLessons?.[lesson.slug] && (
                  <div className="pl-6 py-2">
                    {sections.map((section) => {
                      const sec = resolveSection(section);
                      const isOpen = openSections[sec.slug];
                      const subSections = subSectionsMap[sec.slug] || [];
                      const isActiveSection = sec.slug === activeSection;

                      return (
                        <div key={sec.slug}>
                          <button
                            onClick={async () => {

                              if (!subSectionsMap[sec.slug]) {
                                const res = await fetch(
                                  `/api/lms/sidebar?courseId=${courseId}&lessonId=${lesson.slug}&sectionId=${sec.slug}`
                                );

                                const data = await res.json();

                                setSubSectionsMap(prev => ({
                                  ...prev,
                                  [sec.slug]: data
                                }));
                              }

                              setOpenSections((prev) => ({
                                ...prev,
                                [sec.slug]: !prev[sec.slug]
                              }));

                              onSelect({
                                lesson: lesson.slug,
                                section: sec.slug,
                                subSection: null
                              });
                            }}
                            className={`flex items-start p-1 justify-between text-gray-200 w-full py-1 gap-[8px] text-[15px] border-0 cursor-pointer text-left rounded-md ${isActiveSection ? "bg-yellow-600" : "bg-transparent"
                              }`}
                          >
                            <span className="font-serif leading-[1.3] flex-1 flex items-center gap-2">
                              <span className="w-[12px] h-[12px] rounded-full bg-white shrink-0"></span>
                              {sec.title}
                            </span>

                            {subSections.length > 0 && (
                              <ChevronDown
                                size={18}
                                className="transition-all duration-200"
                                style={{
                                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
                                }}
                              />
                            )}
                          </button>

                          {isOpen && subSections.length > 0 && (
                            <div className="pl-[12px]">
                              {subSections.map((sub) => {
                                const ss = resolveSubSection(sub);
                                const isActiveSub = ss.slug === activeSubSection;

                                return (
                                  <button
                                    key={ss.slug}
                                    onClick={() =>
                                      onSelect({
                                        lesson: lesson.slug,
                                        section: sec.slug,
                                        subSection: ss.slug
                                      })
                                    }
                                    className={`border-0 cursor-pointer text-[12px] text-gray-300 mt-1 flex items-center gap-2 text-left w-full rounded-md ${isActiveSub ? "bg-yellow-600" : "bg-transparent"
                                      }`}
                                  >
                                    <span className="w-[8px] h-[8px] rounded-full bg-white shrink-0"></span>
                                    <span className="leading-[1.3]">{ss.title}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <style>{`
        @media (min-width: 769px) {
          .course-sidebar {
            position: sticky !important;
            left: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
