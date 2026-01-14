#!/usr/bin/env tsx
/**
 * Script to generate nifty50-constituents.json from ind_nifty50list.csv
 * Run: pnpm tsx src/historical-data/generate-nifty50-json.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Constituent {
  companyName: string;
  industry: string;
  symbol: string;
  series: string;
  isin: string;
  instrumentKey: string;
}

interface Nifty50Data {
  metadata: {
    index: string;
    lastUpdated: string;
    totalConstituents: number;
  };
  constituents: Constituent[];
}

function parseCSV(csvContent: string): Constituent[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');

  const constituents: Constituent[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',');

    const companyName = values[0];
    const industry = values[1];
    const symbol = values[2];
    const series = values[3];
    const isin = values[4];

    // Skip dummy entries
    if (companyName.toLowerCase().includes('dummy')) {
      console.log(`Skipping dummy entry: ${companyName}`);
      continue;
    }

    constituents.push({
      companyName,
      industry,
      symbol,
      series,
      isin,
      instrumentKey: `NSE_EQ|${isin}`,
    });
  }

  return constituents;
}

function main() {
  const csvPath = join(__dirname, 'ind_nifty50list.csv');
  const jsonPath = join(__dirname, 'nifty50-constituents.json');

  console.log('Reading CSV file...');
  const csvContent = readFileSync(csvPath, 'utf-8');

  console.log('Parsing CSV...');
  const constituents = parseCSV(csvContent);

  const data: Nifty50Data = {
    metadata: {
      index: 'NIFTY 50',
      lastUpdated: new Date().toISOString().split('T')[0],
      totalConstituents: constituents.length,
    },
    constituents,
  };

  console.log(`Writing JSON file with ${constituents.length} constituents...`);
  writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');

  console.log('✅ Successfully generated nifty50-constituents.json');
  console.log(`   Total constituents: ${constituents.length}`);
  console.log(`   Last updated: ${data.metadata.lastUpdated}`);
}

main();
