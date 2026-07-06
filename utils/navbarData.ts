import { connectMongo } from '@/utils/mongodb';
import { Category } from '@/models/category';
import course from '@/models/course';

export interface NavbarCourse {
  id: string;
  title: string;
  category: string;
  link: string;
  shortDesc: string;
  level: string;
  rating: number;
  duration: string;
}

export interface NavbarCategory {
  name: string;
  courses: NavbarCourse[];
}

export interface NavbarData {
  categories: NavbarCategory[];
  allCourses: NavbarCourse[];
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
let cachedData: NavbarData | null = null;
let cacheTimestamp: number = 0;

// Check if cache is still valid
function isCacheValid(): boolean {
  return cachedData !== null && (Date.now() - cacheTimestamp) < CACHE_DURATION;
}

export async function getNavbarData(): Promise<NavbarData> {
  // Return cached data if still valid
  if (isCacheValid()) {
    console.log('✅ Returning cached navbar data');
    return cachedData!;
  }

  try {
    console.log('🔄 Fetching fresh navbar data from database');
    await connectMongo();

    // Fetch categories with priority sorting
    const categories = await Category.find()
      .sort({ priority: -1, position: 1 })
      .lean();

    // Fetch all courses for search functionality
    const projection = {
      _id: 1,
      title: 1,
      category: 1,
      link: 1,
      shortDesc: 1,
      level: 1,
      rating: 1,
      duration: 1,
      priority: 1,
    };

    const courses = await course.find({}, projection).lean();

    // Sort courses by priority
    const sortedCourses = courses.sort((a: any, b: any) => {
      const priorityA = a.priority || 999;
      const priorityB = b.priority || 999;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    // Filter out trending courses from categories
    const filteredCategories = categories.filter((cat: any) => cat.name !== "Trending Courses");

    // Transform courses to match interface
    const transformedCourses = sortedCourses.map((c: any) => ({
      id: c._id?.toString() || '',
      title: c.title || '',
      category: c.category || '',
      link: c.link || '',
      shortDesc: c.shortDesc || '',
      level: c.level || '',
      rating: c.rating || 0,
      duration: c.duration || '',
    }));

    // Group courses by category for the navbar dropdown
    const categoriesWithCourses = filteredCategories.map((cat: any) => {
      const categoryName = cat.name;
      const categoryCourses = transformedCourses.filter(
        course => course.category?.toLowerCase() === categoryName.toLowerCase()
      );
      
      return {
        name: categoryName,
        courses: categoryCourses,
      };
    });

    const result = {
      categories: categoriesWithCourses,
      allCourses: transformedCourses,
    };

    // Update cache
    cachedData = result;
    cacheTimestamp = Date.now();

    console.log('✅ Navbar data cached:', {
      categoriesCount: result.categories.length,
      allCoursesCount: result.allCourses.length,
      cacheExpiry: new Date(cacheTimestamp + CACHE_DURATION).toISOString()
    });

    return result;
  } catch (error) {
    console.error('❌ Failed to fetch navbar data:', error);
    
    // Return cached data if available, even if expired, as fallback
    if (cachedData) {
      console.log('⚠️ Returning expired cache as fallback');
      return cachedData;
    }
    
    return {
      categories: [],
      allCourses: [],
    };
  }
}

// Function to clear cache (useful for admin operations)
export function clearNavbarCache(): void {
  cachedData = null;
  cacheTimestamp = 0;
  console.log('🗑️ Navbar cache cleared');
}