import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import LmsContent from "@/models/LmsContent";

export async function GET() {
  try {
    await connectMongo();
    
    /* ⭐ OPTIMIZED: Exclude puckData for faster loading in admin dashboard */
    const contents = await LmsContent.aggregate([
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          _id: 1,
          courseId: 1,
          title: 1,
          createdAt: 1,
          updatedAt: 1,
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
    
    return NextResponse.json(contents, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
      }
    });
  } catch (error: any) {
    console.error("LMS Content All API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}