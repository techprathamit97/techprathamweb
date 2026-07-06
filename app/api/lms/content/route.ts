import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import LmsContent from "@/models/LmsContent";

/* ===================== GET ===================== */
// export async function GET(req: Request) {
//   try {
//     await connectMongo();
//     const { searchParams } = new URL(req.url);
//     const courseId = searchParams.get("courseId");

//     if (!courseId) {
//       return NextResponse.json({ error: "courseId is required" }, { status: 400 });
//     }

//     const content = await LmsContent.findOne({ courseId }).lean();

//     return NextResponse.json(
//       content || { courseId, sidebar: [], puckData: { root: {}, content: [] } }
//     );
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

export async function GET(req: Request) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const lite = searchParams.get("lite");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    // ✅ LITE MODE: Exclude all puckData for faster loading in editor
    if (lite === "true") {
      const result = await LmsContent.aggregate([
        { $match: { courseId } },
        {
          $project: {
            _id: 0,
            courseId: 1,
            title: 1,
            sidebar: {
              $map: {
                input: "$sidebar",
                as: "lesson",
                in: {
                  title: "$$lesson.title",
                  slug: "$$lesson.slug",
                  link: "$$lesson.link",
                  sections: {
                    $map: {
                      input: { $ifNull: ["$$lesson.sections", []] },
                      as: "section",
                      in: {
                        title: "$$section.title",
                        slug: "$$section.slug",
                        type: "$$section.type",
                        link: "$$section.link",
                        subSections: {
                          $map: {
                            input: { $ifNull: ["$$section.subSections", []] },
                            as: "sub",
                            in: {
                              title: "$$sub.title",
                              slug: "$$sub.slug",
                              type: "$$sub.type",
                              link: "$$sub.link"
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ]);

      const content = result[0] || { courseId, sidebar: [] };

      // ⭐ FIX: Add cache busting for development
      const hasTimestamp = req.url.includes('t=');
      const cacheControl = hasTimestamp 
        ? "no-cache, no-store, must-revalidate"
        : "public, s-maxage=60, stale-while-revalidate=120";

      return NextResponse.json(content, {
        headers: {
          "Cache-Control": cacheControl
        }
      });
    }

    // ✅ NORMAL MODE: Return full content (used by other parts of the app)
    const content = await LmsContent.findOne({ courseId })
      .select("courseId sidebar title")
      .lean();

    return NextResponse.json(
      content || {
        courseId,
        sidebar: [],
        puckData: { root: {}, content: [] }
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300"
        }
      }
    );
  } catch (error: any) {
    console.error("LMS Content GET Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}


/* ===================== POST ===================== */
export async function POST(req: Request) {
  try {
    await connectMongo();
    const body = await req.json();

    const {
      courseId,
      sidebar,
      title,
      lessonId,
      sectionId,
      subSectionId,
      puckData,
      mainCoursePuckData, // ⭐ FIX: Special field for main course page puckData
      structureOnly // ⭐ NEW: Flag for structure-only updates
    } = body;

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    let content = await LmsContent.findOne({ courseId });

    /* ---------- MAIN COURSE PAGE SAVE ---------- */
    if (mainCoursePuckData) {
      console.log(`[Content API] Main course page save for courseId: ${courseId}`);
      
      if (!content) {
        content = new LmsContent({ courseId, sidebar: [] });
      }

      // ⭐ FIX: Only update main course puckData, don't touch sidebar
      content.puckData = mainCoursePuckData;
      content.markModified("puckData");
      await content.save();

      return NextResponse.json({ success: true });
    }

    /* ---------- STRUCTURE-ONLY SAVE ---------- */
    if (structureOnly && sidebar) {
      console.log(`[Content API] Structure-only save for courseId: ${courseId} - preserving all puckData`);
      console.log(`[Content API] Received ${sidebar.length} lessons in payload`);
      
      let content = await LmsContent.findOne({ courseId });
      
      if (!content) {
        content = new LmsContent({ courseId });
      }

      console.log(`[Content API] Current DB has ${content.sidebar?.length || 0} lessons`);

      // ⭐ FIX: Process items in payload order to maintain user's intended order
      const updatedSidebar: any[] = [];
      const existingLessonsMap = new Map();
      
      // Build a map of existing lessons by ID and slug for quick lookup
      for (const existingLesson of content.sidebar || []) {
        if (existingLesson.id) {
          existingLessonsMap.set(existingLesson.id, existingLesson);
        }
        existingLessonsMap.set(existingLesson.slug, existingLesson);
      }

      // Process lessons in payload order
      for (const lessonInput of sidebar) {
        // Try to find existing lesson by ID first, then by slug
        const existingLesson = existingLessonsMap.get(lessonInput.id) || existingLessonsMap.get(lessonInput.slug);

        if (existingLesson) {
          // Update existing lesson
          console.log(`[Content API] Updating existing lesson: ${lessonInput.slug} (ID: ${lessonInput.id})`);
          let lesson = existingLesson;
          lesson.id = lessonInput.id || lesson.id;
          lesson.title = lessonInput.title;
          lesson.slug = lessonInput.slug;

          // Build map of existing sections
          const existingSectionsMap = new Map();
          for (const existingSection of lesson.sections || []) {
            if (existingSection.id) {
              existingSectionsMap.set(existingSection.id, existingSection);
            }
            existingSectionsMap.set(existingSection.slug, existingSection);
          }

          // Process sections in payload order
          const updatedSections: any[] = [];
          for (const sectionInput of lessonInput.sections || []) {
            const existingSection = existingSectionsMap.get(sectionInput.id) || existingSectionsMap.get(sectionInput.slug);

            if (existingSection) {
              // Update existing section
              console.log(`[Content API] Updating existing section: ${sectionInput.slug} (ID: ${sectionInput.id})`);
              let section = existingSection;
              section.id = sectionInput.id || section.id;
              section.type = sectionInput.type || section.type || "content";
              section.title = sectionInput.title;
              section.slug = sectionInput.slug;

              // Build map of existing subsections
              const existingSubSectionsMap = new Map();
              for (const existingSub of section.subSections || []) {
                if (existingSub.id) {
                  existingSubSectionsMap.set(existingSub.id, existingSub);
                }
                existingSubSectionsMap.set(existingSub.slug, existingSub);
              }

              // Process subsections in payload order
              const updatedSubSections: any[] = [];
              for (const subInput of sectionInput.subSections || []) {
                const existingSub = existingSubSectionsMap.get(subInput.id) || existingSubSectionsMap.get(subInput.slug);

                if (existingSub) {
                  // Update existing subsection
                  console.log(`[Content API] Updating existing subsection: ${subInput.slug} (ID: ${subInput.id})`);
                  let sub = existingSub;
                  sub.id = subInput.id || sub.id;
                  sub.type = subInput.type || sub.type || "content";
                  sub.title = subInput.title;
                  sub.slug = subInput.slug;
                  updatedSubSections.push(sub);
                } else {
                  // Create new subsection
                  console.log(`[Content API] Creating new subsection: ${subInput.slug} (ID: ${subInput.id})`);
                  const sub = {
                    id: subInput.id,
                    type: subInput.type || "content",
                    title: subInput.title,
                    slug: subInput.slug,
                    puckData: { root: {}, content: [] }
                  };
                  updatedSubSections.push(sub);
                }
              }

              section.subSections = updatedSubSections;
              updatedSections.push(section);
            } else {
              // Create new section
              console.log(`[Content API] Creating new section: ${sectionInput.slug} (ID: ${sectionInput.id})`);
              const section = {
                id: sectionInput.id,
                type: sectionInput.type || "content",
                title: sectionInput.title,
                slug: sectionInput.slug,
                subSections: (sectionInput.subSections || []).map((ss: any) => ({
                  id: ss.id,
                  type: ss.type || "content",
                  title: ss.title,
                  slug: ss.slug,
                  puckData: { root: {}, content: [] }
                })),
                puckData: { root: {}, content: [] }
              };
              updatedSections.push(section);
            }
          }

          lesson.sections = updatedSections;
          updatedSidebar.push(lesson);
        } else {
          // Create new lesson
          console.log(`[Content API] Creating new lesson: ${lessonInput.slug} (ID: ${lessonInput.id})`);
          const lesson = {
            id: lessonInput.id,
            title: lessonInput.title,
            slug: lessonInput.slug,
            sections: (lessonInput.sections || []).map((s: any) => ({
              id: s.id,
              type: s.type || "content",
              title: s.title,
              slug: s.slug,
              subSections: (s.subSections || []).map((ss: any) => ({
                id: ss.id,
                type: ss.type || "content",
                title: ss.title,
                slug: ss.slug,
                puckData: { root: {}, content: [] }
              })),
              puckData: { root: {}, content: [] }
            })),
            puckData: { root: {}, content: [] }
          };
          updatedSidebar.push(lesson);
        }
      }

      content.sidebar = updatedSidebar;
      content.markModified("sidebar");
      await content.save();

      console.log(`[Content API] Structure-only save completed - all puckData preserved`);
      return NextResponse.json({ success: true });
    }

    /* ---------- MAIN COURSE PAGE SAVE ---------- */
    if (mainCoursePuckData) {
      console.log(`[Content API] Main course page save for courseId: ${courseId}`);
      
      if (!content) {
        content = new LmsContent({ courseId, sidebar: [] });
      }

      // ⭐ FIX: Only update main course puckData, don't touch sidebar
      content.puckData = mainCoursePuckData;
      content.markModified("puckData");
      await content.save();

      return NextResponse.json({ success: true });
    }

    /* ---------- PUCK CONTENT SAVE ---------- */
    if (!lessonId || !puckData) {
      return NextResponse.json(
        { error: "lessonId and puckData are required" },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const lesson = content.sidebar.find((l: any) => l.slug === lessonId);
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (sectionId) {
      const section = lesson.sections.find(
        (s: any) => s.slug === sectionId
      );
      if (!section) {
        return NextResponse.json({ error: "Section not found" }, { status: 404 });
      }

      if (subSectionId) {
  let sub = section.subSections.find(
    (ss: any) => ss.slug === subSectionId
  );

  if (!sub) {
    // ✅ AUTO CREATE SUB-SECTION
    sub = {
      title: subSectionId,
      slug: subSectionId,
      type: "content",
      puckData
    };
    section.subSections.push(sub);
  } else {
    sub.puckData = puckData;
  }
}
 else {
        section.puckData = puckData;
      }
    } else {
      lesson.puckData = puckData;
    }

    content.markModified("sidebar");
    await content.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* ===================== DELETE ===================== */
export async function DELETE(req: Request) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id"); // FULL PAGE
    const courseId = searchParams.get("courseId");
    const lessonSlug = searchParams.get("lessonSlug");
    const sectionSlug = searchParams.get("sectionSlug");
    const subSectionSlug = searchParams.get("subSectionSlug");

    /* ---------- FULL PAGE DELETE ---------- */
    if (id) {
      const deleted = await LmsContent.findByIdAndDelete(id);
      if (!deleted) {
        return NextResponse.json(
          { error: "LMS content not found" },
          { status: 404 }
        );
      }   
      return NextResponse.json({ success: true });
    }

    if (!courseId || !lessonSlug) {
      return NextResponse.json(
        { error: "courseId and lessonSlug are required" },
        { status: 400 }
      );
    }

    const content = await LmsContent.findOne({ courseId });
    if (!content) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    /* ---------- DELETE SUB-SECTION ---------- */
    if (sectionSlug && subSectionSlug) {
      content.sidebar = content.sidebar.map((lesson: any) => {
        if (lesson.slug !== lessonSlug) return lesson;

        return {
          ...lesson,
          sections: lesson.sections.map((section: any) => {
            if (section.slug !== sectionSlug) return section;

            return {
              ...section,
              subSections: section.subSections.filter(
                (ss: any) => ss.slug !== subSectionSlug
              )
            };
          })
        };
      });

      content.markModified("sidebar");
      await content.save();
      return NextResponse.json({ success: true });
    }

    /* ---------- DELETE SECTION ---------- */
    if (sectionSlug) {
      content.sidebar = content.sidebar.map((lesson: any) => {
        if (lesson.slug !== lessonSlug) return lesson;

        return {
          ...lesson,
          sections: lesson.sections.filter(
            (s: any) => s.slug !== sectionSlug
          )
        };
      });

      content.markModified("sidebar");
      await content.save();
      return NextResponse.json({ success: true });
    }

    /* ---------- DELETE LESSON ---------- */
    content.sidebar = content.sidebar.filter(
      (lesson: any) => lesson.slug !== lessonSlug
    );

    content.markModified("sidebar");
    await content.save();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
