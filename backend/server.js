const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

app.use(cors("*"));
app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for large chunks

// Helper to read DB
const readDb = () => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading DB:", err);
        return { bins: [] };
    }
};

// Helper to write DB
const writeDb = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error writing DB:", err);
    }
};

// Validation Helper
const validateBin = (bin, existingBins) => {
    const errors = [];

    // Required: tankNumber
    if (!bin.tankNumber) {
        errors.push("tankNumber is required");
    } else {
        // Unique: tankNumber
        if (existingBins.some(b => b.tankNumber === bin.tankNumber)) {
            errors.push(`tankNumber '${bin.tankNumber}' already exists`);
        }
    }

    // State validation
    if (bin.state !== undefined && ![0, 1, 2].includes(bin.state)) {
        errors.push("state must be 0, 1, or 2");
    }

    // Coordinates validation
    if (bin.latitude !== undefined && bin.latitude !== null) {
        if (bin.latitude < -90 || bin.latitude > 90) errors.push("latitude must be between -90 and 90");
    }
    if (bin.longitude !== undefined && bin.longitude !== null) {
        if (bin.longitude < -180 || bin.longitude > 180) errors.push("longitude must be between -180 and 180");
    }

    // Location requirement (Coords OR Address)
    const hasCoords = (bin.latitude !== undefined && bin.latitude !== null) && (bin.longitude !== undefined && bin.longitude !== null);
    const hasAddress = !!bin.city; // Simplified check as per req "city at minimum"
    if (!hasCoords && !hasAddress) {
        errors.push("Either coordinates (lat/long) or address (city) must be provided");
    }

    // Type requirement
    if (!bin.typeId && !bin.typeLabel) {
        errors.push("typeId or typeLabel must be provided");
    }

    // Unique fields check
    const uniqueFields = ['chipNumber', 'rfidNumber', 'uhfNumber', 'memoryChipNumber'];
    uniqueFields.forEach(field => {
        if (bin[field]) {
            if (existingBins.some(b => b[field] === bin[field])) {
                errors.push(`${field} '${bin[field]}' already exists`);
            }
        }
    });

    return errors;
};

// Import Endpoint
app.post('/geored/bin/service/import', (req, res) => {
    const { bins, updateByTankNumber } = req.body;
    
    if (!bins || !Array.isArray(bins)) {
        return res.status(400).json({ message: "Invalid request format. 'bins' array required." });
    }

    const db = readDb();
    const results = [];
    let hasErrors = false;

    // We need to process sequentially to handle uniqueness within the batch itself? 
    // The requirements say "Processes multiple bins... continues processing even if individual bins fail".
    // But for uniqueness checks within the same batch, we should probably check against the DB + successful imports in current batch.
    // For simplicity in this POC, we'll check against DB only, assuming batch doesn't contain self-duplicates or that's a user error.
    
    // Actually, let's be safer and check against DB.
    
    bins.forEach(binInput => {
        const validationErrors = validateBin(binInput, db.bins);
        
        if (validationErrors.length > 0) {
            hasErrors = true; // Overall status might be 422 if any fail? 
            // Req says: "422: Unprocessable Entity - Validation errors in bin data"
            // But also "Error Handling: Individual bin errors don't stop the entire import - errors are captured per bin"
            // Usually this means 201/200 with error details in response, OR 422 if the *entire* request is bad.
            // However, the response schema has `error: boolean` per bin. 
            // Let's assume 201 if at least one succeeds or if the format is "partial success".
            // But the status code section says "422... Validation errors". 
            // If *any* bin has error, maybe return 422? Or only if *all* fail?
            // Let's stick to: If there are validation errors, we return the structure. 
            // If the structure implies per-item error, usually the HTTP status is 200/207 (Multi-Status).
            // But the prompt says "422: Validation errors". I will return 422 if ANY bin fails, but still return the full list of results.
            
            results.push({
                id: null,
                error: true,
                errorMessage: validationErrors.join(', '),
                chipNumber: binInput.chipNumber || null,
                bin: {
                    ...binInput,
                    id: null // Not created
                }
            });
        } else {
            // Success
            const newId = db.bins.length > 0 ? Math.max(...db.bins.map(b => b.id || 0)) + 1 : 1;
            const newBin = {
                ...binInput,
                id: newId,
                commissioningDate: binInput.commissioningDate || new Date().toISOString()
            };
            
            db.bins.push(newBin);
            
            results.push({
                id: newId,
                error: false,
                errorMessage: "",
                chipNumber: newBin.chipNumber || null,
                bin: newBin
            });
        }
    });

    // Save DB if any changes
    if (results.some(r => !r.error)) {
        writeDb(db);
    }

    // Determine status code
    // If we have errors, prompt says 422.
    const statusCode = results.some(r => r.error) ? 422 : 201;

    res.status(statusCode).json({
        bins: results,
        updateByTankNumber: !!updateByTankNumber
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
