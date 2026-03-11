export interface CpcvSplit {
  fold: number;
  trainRanges: { start: string; end: string }[];
  testRanges: { start: string; end: string }[];
}

/**
 * Combinatorial Purged Cross-Validation (CPCV) Generator
 * 
 * Generates CV splits for time-series data while preventing leakage.
 * Uses an embargo period (e.g., 30+ mins) to separate train and test sets
 * since our labels look ahead up to 30 minutes.
 */
export class CpcvSplitter {
  /**
   * Split a contiguous time range into N folds for CPCV
   * 
   * @param config The Configuration for the CPCV splits
   */
  static generateSplits(config: {
    startDate: Date;
    endDate: Date;
    groups: number;        // Number of groups to split the timeline into
    testGroups: number;    // Number of groups to use for testing in each fold
    embargoMinutes: number; // Purge window to prevent leakage
  }): CpcvSplit[] {
    const { startDate, endDate, groups, testGroups, embargoMinutes } = config;
    
    // Total milliseconds in range
    const totalDuration = endDate.getTime() - startDate.getTime();
    
    // Calculate boundaries for each group
    const groupDuration = totalDuration / groups;
    const groupBoundaries = Array.from({ length: groups + 1 }, (_, i) => {
      return new Date(startDate.getTime() + i * groupDuration);
    });

    // Generate combinations of test groups (e.g. choose 2 out of 6)
    const testCombinations = this.getCombinations(
      Array.from({ length: groups }, (_, i) => i), 
      testGroups
    );

    const splits: CpcvSplit[] = [];
    const embargoMs = embargoMinutes * 60 * 1000;

    for (let i = 0; i < testCombinations.length; i++) {
      const testGroupIndices = testCombinations[i];
      const trainRanges: { start: string; end: string }[] = [];
      const testRanges: { start: string; end: string }[] = [];

      for (let g = 0; g < groups; g++) {
        const isTest = testGroupIndices.includes(g);
        
        let rangeStart = groupBoundaries[g].getTime();
        let rangeEnd = groupBoundaries[g + 1].getTime();

        if (isTest) {
          testRanges.push({
            start: new Date(rangeStart).toISOString(),
            end: new Date(rangeEnd).toISOString()
          });
        } else {
          // If it's a train group, we need to apply embargo/purging 
          // to ensure it doesn't leak into adjacent test groups.
          
          // Check previous group
          if (g > 0 && testGroupIndices.includes(g - 1)) {
            // Previous was test, start of this train needs embargo
            rangeStart += embargoMs;
          }
          
          // Check next group
          if (g < groups - 1 && testGroupIndices.includes(g + 1)) {
            // Next is test, end of this train needs embargo
            rangeEnd -= embargoMs;
          }

          // Only add if range is still valid after embargo
          if (rangeStart < rangeEnd) {
            trainRanges.push({
              start: new Date(rangeStart).toISOString(),
              end: new Date(rangeEnd).toISOString()
            });
          }
        }
      }

      splits.push({
        fold: i + 1,
        trainRanges,
        testRanges,
      });
    }

    return splits;
  }

  /**
   * Helper to generate N choose K combinations for test groups
   */
  private static getCombinations<T>(array: T[], k: number): T[][] {
    if (k === 1) return array.map(v => [v]);
    const combos: T[][] = [];
    
    for (let i = 0; i <= array.length - k; i++) {
        const head = array.slice(i, i + 1);
        const tailCombos = this.getCombinations(array.slice(i + 1), k - 1);
        for (let j = 0; j < tailCombos.length; j++) {
            combos.push(head.concat(tailCombos[j]));
        }
    }
    return combos;
  }
}
