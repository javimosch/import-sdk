#!/usr/bin/env node

/**
 * CSV Seed Generator
 * Generates test CSV files with N records
 * 
 * Usage: node seed-csv.js <number_of_records>
 * Example: node seed-csv.js 10000
 */

const fs = require('fs');
const path = require('path');

// Get number of records from command line argument
const numRecords = parseInt(process.argv[2]) || 100;

console.log(`Generating CSV files with ${numRecords} records...`);

// French cities for variety
const cities = [
    { name: 'Paris', lat: 48.8566, lon: 2.3522 },
    { name: 'Lyon', lat: 45.7640, lon: 4.8357 },
    { name: 'Marseille', lat: 43.2965, lon: 5.3698 },
    { name: 'Bordeaux', lat: 44.8378, lon: -0.5792 },
    { name: 'Lille', lat: 50.6292, lon: 3.0573 },
    { name: 'Toulouse', lat: 43.6047, lon: 1.4442 },
    { name: 'Nice', lat: 43.7102, lon: 7.2620 },
    { name: 'Nantes', lat: 47.2184, lon: -1.5536 },
    { name: 'Strasbourg', lat: 48.5734, lon: 7.7521 },
    { name: 'Montpellier', lat: 43.6108, lon: 3.8767 },
    { name: 'Rennes', lat: 48.1173, lon: -1.6778 },
    { name: 'Reims', lat: 49.2583, lon: 4.0317 },
    { name: 'Le Havre', lat: 49.4944, lon: 0.1079 },
    { name: 'Saint-Étienne', lat: 45.4397, lon: 4.3872 },
    { name: 'Toulon', lat: 43.1242, lon: 5.9280 }
];

const binTypes = [1, 2, 3];

// Helper to pad numbers
const pad = (num, size) => String(num).padStart(size, '0');

// Generate Standard Format CSV (test.csv)
function generateStandardFormat(count) {
    const rows = ['tankNumber,typeId,city,latitude,longitude'];
    
    for (let i = 1; i <= count; i++) {
        const city = cities[i % cities.length];
        const typeId = binTypes[i % binTypes.length];
        const tankNumber = `TANK_${pad(i, 6)}`;
        
        // Add slight variation to coordinates
        const latVariation = (Math.random() - 0.5) * 0.01;
        const lonVariation = (Math.random() - 0.5) * 0.01;
        const lat = (city.lat + latVariation).toFixed(4);
        const lon = (city.lon + lonVariation).toFixed(4);
        
        rows.push(`${tankNumber},${typeId},${city.name},${lat},${lon}`);
    }
    
    return rows.join('\n');
}

// Generate Custom Format CSV (test2.csv)
function generateCustomFormat(count) {
    const rows = ['Tank ID,Type,Location,Lat,Long'];
    
    for (let i = 1; i <= count; i++) {
        const city = cities[i % cities.length];
        const typeId = binTypes[i % binTypes.length];
        const tankId = `BIN_${pad(i, 6)}`;
        
        // Add slight variation to coordinates
        const latVariation = (Math.random() - 0.5) * 0.01;
        const lonVariation = (Math.random() - 0.5) * 0.01;
        const lat = (city.lat + latVariation).toFixed(4);
        const lon = (city.lon + lonVariation).toFixed(4);
        
        rows.push(`${tankId},${typeId},${city.name},${lat},${lon}`);
    }
    
    return rows.join('\n');
}

// Generate files
const standardCsv = generateStandardFormat(numRecords);
const customCsv = generateCustomFormat(numRecords);

// Write files
const testCsvPath = path.join(__dirname, 'test.csv');
const test2CsvPath = path.join(__dirname, 'test2.csv');

fs.writeFileSync(testCsvPath, standardCsv);
fs.writeFileSync(test2CsvPath, customCsv);

console.log(`✓ Generated ${testCsvPath} (${(standardCsv.length / 1024).toFixed(2)} KB)`);
console.log(`✓ Generated ${test2CsvPath} (${(customCsv.length / 1024).toFixed(2)} KB)`);
console.log(`\nFiles contain ${numRecords} records each.`);
