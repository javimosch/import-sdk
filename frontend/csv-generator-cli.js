#!/usr/bin/env node

/**
 * CSV Generator CLI
 * Reads JSON configuration and generates test CSV files with mock data
 * 
 * Usage: node csv-generator-cli.js <config_file> [number_of_records] [output_file]
 * Example: node csv-generator-cli.js container-config.json 1000 test-containers.csv
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const configFile = process.argv[2];
const numRecords = parseInt(process.argv[3]) || 100;
const outputFile = process.argv[4] || 'generated-test.csv';

if (!configFile) {
    console.error('Error: Configuration file is required');
    console.log('Usage: node csv-generator-cli.js <config_file> [number_of_records] [output_file]');
    process.exit(1);
}

// Read configuration file
let config;
try {
    const configPath = path.resolve(configFile);
    if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Error reading configuration file:', error.message);
    process.exit(1);
}

console.log(`Generating CSV with ${numRecords} records using configuration: ${configFile}`);

// Mock data generators
const mockData = {
    // French cities for realistic location data
    cities: [
        { name: 'Paris', lat: 48.8566, lon: 2.3522, zipCode: '75001', department: 'Paris', region: 'Île-de-France' },
        { name: 'Lyon', lat: 45.7640, lon: 4.8357, zipCode: '69001', department: 'Rhône', region: 'Auvergne-Rhône-Alpes' },
        { name: 'Marseille', lat: 43.2965, lon: 5.3698, zipCode: '13001', department: 'Bouches-du-Rhône', region: 'Provence-Alpes-Côte d\'Azur' },
        { name: 'Bordeaux', lat: 44.8378, lon: -0.5792, zipCode: '33000', department: 'Gironde', region: 'Nouvelle-Aquitaine' },
        { name: 'Lille', lat: 50.6292, lon: 3.0573, zipCode: '59000', department: 'Nord', region: 'Hauts-de-France' },
        { name: 'Toulouse', lat: 43.6047, lon: 1.4442, zipCode: '31000', department: 'Haute-Garonne', region: 'Occitanie' },
        { name: 'Nice', lat: 43.7102, lon: 7.2620, zipCode: '06000', department: 'Alpes-Maritimes', region: 'Provence-Alpes-Côte d\'Azur' },
        { name: 'Nantes', lat: 47.2184, lon: -1.5536, zipCode: '44000', department: 'Loire-Atlantique', region: 'Pays de la Loire' },
        { name: 'Strasbourg', lat: 48.5734, lon: 7.7521, zipCode: '67000', department: 'Bas-Rhin', region: 'Grand Est' },
        { name: 'Montpellier', lat: 43.6108, lon: 3.8767, zipCode: '34000', department: 'Hérault', region: 'Occitanie' }
    ],
    
    // Container types and categories
    containerTypes: [
        { id: 1, label: 'Poubelle classique', categoryId: 1, categoryLabel: 'Déchets ménagers' },
        { id: 2, label: 'Conteneur à verre', categoryId: 2, categoryLabel: 'Recyclage' },
        { id: 3, label: 'Benne industrielle', categoryId: 3, categoryLabel: 'Déchets industriels' },
        { id: 4, label: 'Composteur', categoryId: 4, categoryLabel: 'Déchets organiques' },
        { id: 5, label: 'Conteneur à papier', categoryId: 2, categoryLabel: 'Recyclage' }
    ],
    
    // Flux materials
    fluxMaterials: [
        { id: 1, label: 'Déchets ménagers' },
        { id: 2, label: 'Verre' },
        { id: 3, label: 'Papier/Carton' },
        { id: 4, label: 'Plastique' },
        { id: 5, label: 'Organique' },
        { id: 6, label: 'Métaux' }
    ],
    
    // Rounds/circuits
    rounds: [
        { id: 1, shortName: 'RND-001' },
        { id: 2, shortName: 'RND-002' },
        { id: 3, shortName: 'RND-003' },
        { id: 4, shortName: 'RND-004' },
        { id: 5, shortName: 'RND-005' }
    ],
    
    // Makes/models
    makes: [
        { id: 1, maker: 'PlastiquePro', model: 'PP-2000', volume: 200.0, loadMax: 150.0 },
        { id: 2, maker: 'MetalCorp', model: 'MC-500', volume: 500.0, loadMax: 400.0 },
        { id: 3, maker: 'EcoBin', model: 'EB-1000', volume: 1000.0, loadMax: 800.0 },
        { id: 4, maker: 'GreenTech', model: 'GT-750', volume: 750.0, loadMax: 600.0 }
    ],
    
    // Streets
    streets: [
        'Rue de la République', 'Avenue des Champs-Élysées', 'Boulevard Saint-Germain',
        'Rue de Rivoli', 'Avenue Foch', 'Place de la Concorde', 'Rue du Faubourg Saint-Honoré',
        'Boulevard Haussmann', 'Avenue Montaigne', 'Rue de la Paix'
    ]
};

// Helper functions
const pad = (num, size) => String(num).padStart(size, '0');
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 2) => {
    const num = Math.random() * (max - min) + min;
    return parseFloat(num.toFixed(decimals));
};
const randomBoolean = () => Math.random() > 0.3; // 70% true, 30% false
const randomDate = () => {
    const start = new Date(2020, 0, 1);
    const end = new Date();
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().replace('T', ' ').substring(0, 19);
};

// Generate mock value based on field configuration
function generateMockValue(field, index) {
    switch (field.name) {
        case 'typeId':
            return randomChoice(mockData.containerTypes).id;
        case 'typeLabel':
            return randomChoice(mockData.containerTypes).label;
        case 'categoryId':
            return randomChoice(mockData.containerTypes).categoryId;
        case 'categoryLabel':
            return randomChoice(mockData.containerTypes).categoryLabel;
        case 'areaId':
            return randomInt(1, 10);
        case 'fluxMaterialId':
            return randomChoice(mockData.fluxMaterials).id;
        case 'fluxMaterialLabel':
            return randomChoice(mockData.fluxMaterials).label;
        case 'roundId':
            return randomChoice(mockData.rounds).id;
        case 'roundShortName':
            return randomChoice(mockData.rounds).shortName;
        case 'makeId':
            return randomChoice(mockData.makes).id;
        case 'volume':
            return randomChoice(mockData.makes).volume;
        case 'loadMax':
            return randomChoice(mockData.makes).loadMax;
        case 'maker':
            return randomChoice(mockData.makes).maker;
        case 'model':
            return randomChoice(mockData.makes).model;
        case 'chipNumber':
            return `CHIP_${pad(index, 8)}`;
        case 'tankNumber':
            return `TANK_${pad(index, 8)}`;
        case 'rfidNumber':
            return `RFID_${pad(index, 8)}`;
        case 'uhfNumber':
            return `UHF_${pad(index, 8)}`;
        case 'memoryChipNumber':
            return `MEM_${pad(index, 8)}`;
        case 'longitude':
        case 'latitude': {
            const city = randomChoice(mockData.cities);
            const variation = (Math.random() - 0.5) * 0.01;
            if (field.name === 'longitude') {
                return (city.lon + variation).toFixed(6);
            } else {
                return (city.lat + variation).toFixed(6);
            }
        }
        case 'streetNumber':
            return randomInt(1, 999).toString();
        case 'roadNumber':
            return `D${randomInt(1, 999)}`;
        case 'street':
            return randomChoice(mockData.streets);
        case 'city':
            return randomChoice(mockData.cities).name;
        case 'zipCode':
            return randomChoice(mockData.cities).zipCode;
        case 'borough':
            return randomInt(1, 20).toString();
        case 'department':
            return randomChoice(mockData.cities).department;
        case 'region':
            return randomChoice(mockData.cities).region;
        case 'country':
            return 'France';
        case 'comment':
            return `Commentaire pour contenant ${index}`;
        case 'active':
            return randomBoolean();
        case 'commissioningDate':
            return randomDate();
        case 'state':
            return randomInt(0, 2);
        default:
            return `mock_${field.name}_${index}`;
    }
}

// Generate CSV content
function generateCSV(config, recordCount) {
    const headers = config.fields.map(field => field.name);
    const rows = [headers.join(',')];
    
    for (let i = 1; i <= recordCount; i++) {
        const values = config.fields.map(field => {
            const value = generateMockValue(field, i);
            // Escape commas and quotes in values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        rows.push(values.join(','));
    }
    
    return rows.join('\n');
}

// Generate and save CSV
try {
    const csvContent = generateCSV(config, numRecords);
    const outputPath = path.resolve(outputFile);
    
    fs.writeFileSync(outputPath, csvContent);
    
    console.log(`✓ Generated ${outputPath} (${(csvContent.length / 1024).toFixed(2)} KB)`);
    console.log(`✓ CSV contains ${numRecords} records with ${config.fields.length} columns`);
    console.log(`✓ Columns: ${config.fields.map(f => f.name).join(', ')}`);
} catch (error) {
    console.error('Error generating CSV:', error.message);
    process.exit(1);
}
