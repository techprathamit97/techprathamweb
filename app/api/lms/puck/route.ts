
import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import LmsContent from "@/models/LmsContent";

type LmsDoc = {
  sidebar: any[];
};
export async function GET(req: Request) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const lessonId = searchParams.get("lessonId");
    const sectionId = searchParams.get("sectionId");
    const subSectionId = searchParams.get("subSectionId");

    console.log(`[Puck GET] Fetching: courseId=${courseId}, lessonId=${lessonId}, sectionId=${sectionId}, subSectionId=${subSectionId}`);

    if (!courseId || !lessonId) {
      return NextResponse.json({ error: "courseId and lessonId are required" }, { status: 400 });
    }

    /* ⭐ OPTIMIZED: Use aggregation to fetch only the specific puckData */
    const pipeline: any[] = [
      { $match: { courseId } },
      { $unwind: "$sidebar" },
      { $match: { "sidebar.slug": lessonId } }
    ];

    if (subSectionId && sectionId) {
      // Fetch specific subsection puckData
      pipeline.push(
        { $unwind: "$sidebar.sections" },
        { $match: { "sidebar.sections.slug": sectionId } },
        { $unwind: "$sidebar.sections.subSections" },
        { $match: { "sidebar.sections.subSections.slug": subSectionId } },
        {
          $project: {
            _id: 0,
            puckData: "$sidebar.sections.subSections.puckData"
          }
        }
      );
    } else if (sectionId) {
      // Fetch specific section puckData
      pipeline.push(
        { $unwind: "$sidebar.sections" },
        { $match: { "sidebar.sections.slug": sectionId } },
        {
          $project: {
            _id: 0,
            puckData: "$sidebar.sections.puckData"
          }
        }
      );
    } else {
      // Fetch lesson puckData only
      pipeline.push({
        $project: {
          _id: 0,
          puckData: "$sidebar.puckData"
        }
      });
    }

    console.log(`[Puck GET] MongoDB Pipeline:`, JSON.stringify(pipeline, null, 2));
    
    const result = await LmsContent.aggregate(pipeline);
    console.log(`[Puck GET] Aggregation result:`, JSON.stringify(result, null, 2));

    let puckData = result[0]?.puckData || { root: {}, content: [] };
    
    // ⭐ FIX: Add validation and fallback for puckData structure
    if (!puckData || typeof puckData !== 'object') {
      console.log(`[Puck GET] WARNING: Invalid puckData, using default:`, puckData);
      puckData = { root: {}, content: [] };
    } else {
      // Ensure content is an array
      if (!Array.isArray(puckData.content)) {
        console.log(`[Puck GET] WARNING: content is not an array, converting:`, puckData.content);
        puckData.content = [];
      }
      
      // Ensure root exists
      if (!puckData.root || typeof puckData.root !== 'object') {
        console.log(`[Puck GET] WARNING: root is missing or invalid, setting default:`, puckData.root);
        puckData.root = {};
      }
      
      // Ensure zones exist if referenced in content
      if (!puckData.zones) {
        puckData.zones = {};
      }
    }
    
    console.log(`[Puck GET] Final puckData structure:`, {
      hasContent: !!puckData.content,
      contentLength: puckData.content?.length || 0,
      hasZones: !!puckData.zones,
      zonesKeys: puckData.zones ? Object.keys(puckData.zones) : [],
      hasRoot: !!puckData.root
    });

    // ⭐ FIX: Smarter caching - shorter cache for recently updated content
    const hasTimestamp = req.url.includes('t=');
    const cacheControl = hasTimestamp 
      ? "no-cache, no-store, must-revalidate" // Force fresh data when timestamp present
      : "public, s-maxage=30, stale-while-revalidate=60";

    return NextResponse.json(puckData, {
      headers: {
        "Cache-Control": cacheControl
      }
    });
  } catch (error: any) {
    console.error("Puck API Error:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json({ 
      error: error.message,
      details: `Failed to fetch puck data for courseId=${req.url}`
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    await connectMongo();
    const body = await req.json();
    const { courseId, lessonId, sectionId, subSectionId, puckData } = body;

    console.log(`[Puck POST] Saving ${subSectionId ? 'subsection' : sectionId ? 'section' : 'lesson'} for course: ${courseId}`);
    console.log(`[Puck POST] Data size: ${JSON.stringify(puckData).length} bytes`);

    if (!courseId || !lessonId || !puckData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    /* ⭐ OPTIMIZED: Use MongoDB update operators instead of loading entire document */
    
    // Build the update path based on what we're updating
    let updatePath: string;
    let arrayFilters: any[] = [];

    if (subSectionId && sectionId) {
      // Update subsection puckData
      updatePath = "sidebar.$[lesson].sections.$[section].subSections.$[sub].puckData";
      arrayFilters = [
        { "lesson.slug": lessonId },
        { "section.slug": sectionId },
        { "sub.slug": subSectionId }
      ];
    } else if (sectionId) {
      // Update section puckData
      updatePath = "sidebar.$[lesson].sections.$[section].puckData";
      arrayFilters = [
        { "lesson.slug": lessonId },
        { "section.slug": sectionId }
      ];
    } else {
      // Update lesson puckData
      updatePath = "sidebar.$[lesson].puckData";
      arrayFilters = [
        { "lesson.slug": lessonId }
      ];
    }

    const updateStart = Date.now();
    const result = await LmsContent.updateOne(
      { courseId },
      { $set: { [updatePath]: puckData } },
      { arrayFilters }
    );
    console.log(`[Puck POST] Update took: ${Date.now() - updateStart}ms`);

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (result.modifiedCount === 0) {
      console.log(`[Puck POST] No modification, item might not exist. Falling back to creation.`);
      
      // ⭐ FIX: Use atomic operations to avoid data loss during concurrent updates
      if (subSectionId && sectionId) {
        // Try to create the subsection if it doesn't exist
        const createResult = await LmsContent.updateOne(
          { 
            courseId,
            "sidebar.slug": lessonId,
            "sidebar.sections.slug": sectionId
          },
          { 
            $push: { 
              "sidebar.$.sections.$[section].subSections": {
                type: 'content',
                title: subSectionId.replace(/-/g, ' '),
                slug: subSectionId,
                puckData
              }
            }
          },
          { 
            arrayFilters: [{ "section.slug": sectionId }]
          }
        );
        
        if (createResult.modifiedCount === 0) {
          return NextResponse.json({ error: "Failed to create subsection" }, { status: 404 });
        }
      } else if (sectionId) {
        // Try to create the section if it doesn't exist  
        const createResult = await LmsContent.updateOne(
          { 
            courseId,
            "sidebar.slug": lessonId
          },
          { 
            $push: { 
              "sidebar.$.sections": {
                type: 'content',
                title: sectionId.replace(/-/g, ' '),
                slug: sectionId,
                puckData,
                subSections: []
              }
            }
          }
        );
        
        if (createResult.modifiedCount === 0) {
          return NextResponse.json({ error: "Failed to create section" }, { status: 404 });
        }
      } else {
        // Lesson should always exist, just update its puckData
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
      }
    }

    console.log(`[Puck POST] Total time: ${Date.now() - startTime}ms`);
    
    // ⭐ FIX: Add success response with metadata for debugging
    return NextResponse.json({ 
      success: true, 
      updated: result.modifiedCount > 0 ? 'existing' : 'created',
      processingTime: Date.now() - startTime 
    });
  } catch (error: any) {
    console.error("[Puck POST] Save Error:", error);
    console.log(`[Puck POST] Failed after: ${Date.now() - startTime}ms`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
