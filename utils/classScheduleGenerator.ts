interface BatchScheduleConfig {
  batchId: string;
  batchName: string;
  courseTitle: string;
  trainerId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  classFrequency: 'daily' | 'weekly' | 'custom';
  classDuration: number; // in minutes
  daysOfWeek: string[]; // ['Monday', 'Tuesday', etc.]
}

interface GeneratedClass {
  id: string; // temporary ID for frontend
  moduleTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  batchId: string;
  batchName: string;
  courseTitle: string;
  trainerId: string;
  isGenerated: boolean; // true = frontend only, false = saved to DB
  classNumber: number;
}

export class ClassScheduleGenerator {
  
  static generateClasses(config: BatchScheduleConfig): GeneratedClass[] {
    const classes: GeneratedClass[] = [];
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);
    
    console.log('Generating classes for batch:', config.batchName);
    console.log('Date range:', startDate.toDateString(), 'to', endDate.toDateString());
    console.log('Days of week:', config.daysOfWeek);
    
    if (config.classFrequency === 'daily') {
      return this.generateDailyClasses(config, startDate, endDate);
    } else if (config.classFrequency === 'weekly' || config.classFrequency === 'custom') {
      return this.generateWeeklyClasses(config, startDate, endDate);
    }
    
    return classes;
  }
  
  private static generateDailyClasses(
    config: BatchScheduleConfig, 
    startDate: Date, 
    endDate: Date
  ): GeneratedClass[] {
    const classes: GeneratedClass[] = [];
    const current = new Date(startDate);
    let classNumber = 1;
    
    // Default to weekdays for daily classes
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    while (current <= endDate) {
      const dayName = current.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (weekdays.includes(dayName)) {
        classes.push(this.createGeneratedClass(config, current, classNumber));
        classNumber++;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return classes;
  }
  
  private static generateWeeklyClasses(
    config: BatchScheduleConfig, 
    startDate: Date, 
    endDate: Date
  ): GeneratedClass[] {
    const classes: GeneratedClass[] = [];
    const current = new Date(startDate);
    let classNumber = 1;
    
    // Map day names to numbers (0 = Sunday, 1 = Monday, etc.)
    const dayMap: Record<string, number> = {
      'Sunday': 0,
      'Monday': 1, 
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    };
    
    const selectedDayNumbers = config.daysOfWeek.map(day => dayMap[day]).filter(num => num !== undefined);
    
    console.log('Selected day numbers:', selectedDayNumbers);
    
    while (current <= endDate) {
      const currentDayNumber = current.getDay();
      
      if (selectedDayNumbers.includes(currentDayNumber)) {
        classes.push(this.createGeneratedClass(config, current, classNumber));
        classNumber++;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return classes;
  }
  
  private static createGeneratedClass(
    config: BatchScheduleConfig, 
    date: Date, 
    classNumber: number
  ): GeneratedClass {
    const classDate = new Date(date);
    const dateStr = classDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return {
      id: `generated-${config.batchId}-${dateStr}-${classNumber}`, // temporary ID
      moduleTitle: `Class ${classNumber} - ${config.courseTitle}`,
      scheduledDate: dateStr,
      scheduledTime: config.startTime,
      duration: config.classDuration,
      status: 'scheduled',
      batchId: config.batchId,
      batchName: config.batchName,
      courseTitle: config.courseTitle,
      trainerId: config.trainerId,
      isGenerated: true, // frontend only
      classNumber
    };
  }
  
  // Merge generated classes with database classes
  static mergeWithDatabaseClasses(
    generatedClasses: GeneratedClass[], 
    dbClasses: any[]
  ): GeneratedClass[] {
    const merged: GeneratedClass[] = [];
    const dbClassesByDate: Record<string, any> = {};
    
    // Index database classes by date
    dbClasses.forEach(dbClass => {
      const dateKey = new Date(dbClass.scheduledDate).toISOString().split('T')[0];
      dbClassesByDate[dateKey] = dbClass;
    });
    
    // Merge generated classes with database classes
    generatedClasses.forEach(genClass => {
      const dbClass = dbClassesByDate[genClass.scheduledDate];
      
      if (dbClass) {
        // Use database class if it exists
        merged.push({
          id: dbClass._id,
          moduleTitle: dbClass.moduleTitle,
          scheduledDate: genClass.scheduledDate,
          scheduledTime: dbClass.scheduledTime,
          duration: dbClass.duration,
          status: dbClass.status,
          batchId: genClass.batchId,
          batchName: genClass.batchName,
          courseTitle: genClass.courseTitle,
          trainerId: genClass.trainerId,
          isGenerated: false, // saved to DB
          classNumber: genClass.classNumber
        });
      } else {
        // Use generated class
        merged.push(genClass);
      }
    });
    
    return merged;
  }
  
  // Calculate total classes for a batch configuration
  static calculateTotalClasses(config: BatchScheduleConfig): number {
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);
    let count = 0;
    
    if (config.classFrequency === 'daily') {
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const dayName = current.toLocaleDateString('en-US', { weekday: 'long' });
        if (weekdays.includes(dayName)) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
    } else if (config.classFrequency === 'weekly' || config.classFrequency === 'custom') {
      const dayMap: Record<string, number> = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      
      const selectedDayNumbers = config.daysOfWeek.map(day => dayMap[day]).filter(num => num !== undefined);
      const current = new Date(startDate);
      
      while (current <= endDate) {
        if (selectedDayNumbers.includes(current.getDay())) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
    }
    
    return count;
  }
}

export default ClassScheduleGenerator;