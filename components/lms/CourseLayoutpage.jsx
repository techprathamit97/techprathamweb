import CourseSidebar from "./CourseSidebar";

export default function CourseLayout({ courseId, children }) {
  const sidebarData =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(`course-${courseId}`))?.sidebar || []
      : [];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* <CourseSidebar items={sidebarData} /> */}
      <main style={{ flex: 1, padding: "40px" }}>{children}</main>
    </div>
  );
}
