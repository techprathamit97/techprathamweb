// import { NextResponse } from "next/server";
// import { connectMongo } from "@/utils/mongodb";
// import LmsContent from "@/models/LmsContent";

// /* ---------- TYPES ---------- */
// type LessonItem = {
//   title: string;
//   slug: string;
//   link?: string;
// };

// type SidebarDoc = {
//   sidebar: LessonItem[];
// };

// export async function GET(req: Request) {
//   try {
//     await connectMongo();

//     const { searchParams } = new URL(req.url);
//     const courseId = searchParams.get("courseId");

//     if (!courseId) {
//       return NextResponse.json(
//         { error: "courseId is required" },
//         { status: 400 }
//       );
//     }

//     /* ⭐ FETCH ONLY REQUIRED FIELDS (FAST QUERY) */
//     const content = await LmsContent.findOne(
//       { courseId },
//       { "sidebar.title": 1, "sidebar.slug": 1, "sidebar.link": 1, _id: 0 }
//     ).lean<SidebarDoc>();

//     if (!content?.sidebar?.length) {
//       return NextResponse.json([]);
//     }

//     /* ⭐ CLEAN RESPONSE */
//     const lessons = content.sidebar.map((lesson) => ({
//       title: lesson.title,
//       slug: lesson.slug,
//       link: lesson.link || ""
//     }));

//     return NextResponse.json(lessons);

//   } catch (error: any) {
//     console.error("Sidebar API Error:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch lessons" },
//       { status: 500 }
//     );
//   }
// }




import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import LmsContent from "@/models/LmsContent";

/* ---------- TYPES ---------- */
type SubSection = {
  title: string;
  slug: string;
  type?: string;
};

type Section = {
  title: string;
  slug: string;
  type?: string;
  subSections?: SubSection[];
};

type Lesson = {
  title: string;
  slug: string;
  sections?: Section[];
};

type SidebarDoc = {
  sidebar: Lesson[];
};

export async function GET(req: Request) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const lessonId = searchParams.get("lessonId");
    const sectionId = searchParams.get("sectionId");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    /* ⭐ OPTIMIZED: Use aggregation to exclude puckData at all levels */
    const result = await LmsContent.aggregate([
      { $match: { courseId } },
      {
        $project: {
          _id: 0,
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

    const content = result[0];

    if (!content?.sidebar?.length) {
      return NextResponse.json([], {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
        }
      });
    }

    /* ⭐ CASE 1: Return only lessons (no lessonId provided) */
    if (!lessonId) {
      const lessons = content.sidebar.map((l: any) => ({
        title: l.title,
        slug: l.slug
      }));

      return NextResponse.json(lessons, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
        }
      });
    }

    /* ⭐ CASE 2: Return sections for a specific lesson */
    const lesson = content.sidebar.find((l: any) => l.slug === lessonId);
    
    if (!lesson) {
      return NextResponse.json([], {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
        }
      });
    }

    if (!sectionId) {
      const sections = lesson.sections?.map((s: any) => ({
        title: s.title,
        slug: s.slug,
        type: s.type
      })) || [];

      return NextResponse.json(sections, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
        }
      });
    }

    /* ⭐ CASE 3: Return subsections for a specific section */
    const section = lesson.sections?.find((s: any) => s.slug === sectionId);
    
    if (!section) {
      return NextResponse.json([], {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
        }
      });
    }

    const subSections = section.subSections?.map((ss: any) => ({
      title: ss.title,
      slug: ss.slug,
      type: ss.type
    })) || [];

    return NextResponse.json(subSections, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
      }
    });

  } catch (error: any) {
    console.error("Sidebar API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sidebar" },
      { status: 500 }
    );
  }
}
