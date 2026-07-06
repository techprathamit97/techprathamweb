


// "use client";

// import { useState } from "react";
// import CourseSidebar from "./CourseSidebar";

// const scrollContentToTop = () => {
//   const el = document.getElementById("course-scroll-container");
//   if (el) el.scrollTop = 0;
// };

// export default function CourseLayout({
//   courseId,
//   children,
//   onLessonSelect,
//   activeLesson,
//   activeSection,
//   activeSubSection,
//   sidebarData = []
// })
//  {
//   const [sidebarOpen, setSidebarOpen] = useState(false);

//   return (
//     <div style={{ display: "flex", height: "100vh" }}>
//       {/* MOBILE MENU BUTTON */}
//       <button
//         onClick={() => setSidebarOpen(true)}
//         className="course-menu-btn"
//         style={{
//           position: "fixed",
//           // top: 20,
//           // left: 12,
//           zIndex: 1001,
//           padding: "8px 12px",
//           borderRadius: "8px",
//           border: "none",
//           background: "#e31818",
//           color: "#fff",
//           fontSize: "18px",
//           display: "none"
//         }}
//       >
//         ☰
//       </button>

//      <CourseSidebar
//   items={sidebarData}
//   onSelect={(payload) => {
//     setSidebarOpen(false);
//     onLessonSelect(payload);

//     requestAnimationFrame(() => {
//       scrollContentToTop();
//       console.log("ACTIVE SECTION:", activeSection);
// console.log("ACTIVE SUB:", activeSubSection);

//     });
//   }}
//   activeLesson={activeLesson}
//   activeSection={activeSection}
//   activeSubSection={activeSubSection}
//   courseId={courseId}
//   isOpen={sidebarOpen}
//   onClose={() => setSidebarOpen(false)}
  
// />



//       {/* CONTENT SCROLL AREA */}
//       <main
//         id="course-scroll-container"
//         style={{
//           flex: 1,
//           padding: "10px",
//           overflowY: "auto"
//         }}
//       >
//         {children}
//       </main>

//       {/* RESPONSIVE RULES */}
//       <style>{`
//         @media (max-width: 768px) {
//           .course-menu-btn {
//             display: block !important;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import CourseSidebar from "./CourseSidebar";

const scrollContentToTop = () => {
  const el = document.getElementById("course-scroll-container");
  if (el) el.scrollTop = 0;
};

export default function CourseLayout({
  courseId,
  children,
  onLessonSelect,
  activeLesson,
  activeSection,
  activeSubSection
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">

      {/* MOBILE MENU BUTTON */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="course-menu-btn fixed z-[1001] p-2 px-3 rounded-lg border-none bg-[#e31818] text-white text-lg hidden max-[768px]:block"
      >
        ☰
      </button>

      {/* SIDEBAR */}
      <CourseSidebar
        courseId={courseId}
        activeLesson={activeLesson}
        activeSection={activeSection}
        activeSubSection={activeSubSection}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={(payload) => {
          setSidebarOpen(false);
          onLessonSelect(payload);

          requestAnimationFrame(() => {
            scrollContentToTop();
          });
        }}
      />

      {/* CONTENT AREA */}
      <main
        id="course-scroll-container"
        className="flex-1 p-[10px] overflow-y-auto"
      >
        {children}
      </main>

    </div>
  );
}
