# CSV Generator CLI

A command-line tool that reads JSON configuration files and generates test CSV files with mock data.

## Usage

```bash
node csv-generator-cli.js <config_file> [number_of_records] [output_file]
```

### Parameters

- **config_file**: Path to JSON configuration file (required)
- **number_of_records**: Number of records to generate (optional, default: 100)
- **output_file**: Output CSV filename (optional, default: generated-test.csv)

### Examples

Generate 1000 records using container configuration:
```bash
node csv-generator-cli.js container-config.json 1000 containers.csv
```

Generate default 100 records:
```bash
node csv-generator-cli.js container-config.json
```

Generate 5000 records with custom output file:
```bash
node csv-generator-cli.js container-config.json 5000 large-dataset.csv
```

## Configuration Format

The JSON configuration file should define the structure of your CSV with the following format:

```json
{
  "name": "Configuration Name",
  "description": "Description of the configuration",
  "fields": [
    {
      "name": "fieldName",
      "description": "Field description",
      "type": "string|int|float|boolean",
      "required": true,
      "default": "default_value"
    }
  ]
}
```

## Supported Field Types

- **string**: Text values
- **int**: Integer values
- **float**: Floating-point values
- **boolean**: True/false values

## Mock Data Generation

The tool automatically generates realistic mock data for common field patterns:

- **Location data**: French cities with coordinates, postal codes, regions
- **Container data**: Types, categories, materials, manufacturers
- **Identifiers**: Sequential numbers for chips, tanks, RFID tags
- **Dates**: Random dates between 2020 and current date
- **Boolean values**: 70% true, 30% false distribution

## Sample Configuration

See `container-config.json` for a complete example configuration that generates container test data with 34 fields including types, locations, identifiers, and metadata.

## Output

The tool generates a properly formatted CSV file with:
- Header row with field names
- Data rows with escaped values (commas and quotes are properly handled)
- Console output showing file size and record count
