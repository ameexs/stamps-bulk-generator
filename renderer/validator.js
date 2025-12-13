/**
 * Data Validation Module
 * Validates parsed data before XML generation
 */

// Mandatory fields that must have values
const MANDATORY_FIELDS = [
    'refNo',
    'instrumentDate',
    'instrumentDateReceive',
    'principal',
    'typeOfInstrument',
    'transferor.type',
    'transferor.name',
    'transferee.type',
    'transferee.name',
    'consideration',
    'noOfCopy'
];

// Date format regex
const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

/**
 * Validate all records
 * @param {Array} mappedData - Array of mapped record objects
 * @param {Map} attachmentFiles - Map of filename -> attachment data
 * @returns {Object} Validation results
 */
export async function validateAll(mappedData, attachmentFiles) {
    const errors = [];
    const warnings = [];
    let validCount = 0;

    for (const record of mappedData) {
        const rowNumber = record._rowNumber;
        const rowErrors = [];
        const rowWarnings = [];

        // Check mandatory fields
        for (const fieldPath of MANDATORY_FIELDS) {
            const value = getNestedValue(record, fieldPath);
            if (value === undefined || value === null || value === '') {
                rowErrors.push({
                    rowNumber,
                    fieldName: fieldPath,
                    errorType: 'MISSING_FIELD',
                    message: `Missing required field: ${getFieldDisplayName(fieldPath)}`
                });
            }
        }

        // Validate date formats
        const dateFields = ['instrumentDate', 'instrumentDateReceive'];
        for (const field of dateFields) {
            const value = record[field];
            if (value && !DATE_REGEX.test(value)) {
                rowErrors.push({
                    rowNumber,
                    fieldName: field,
                    errorType: 'INVALID_DATE',
                    message: `Invalid date format for ${getFieldDisplayName(field)}. Expected DD/MM/YYYY, got: ${value}`
                });
            }
        }

        // Validate numeric fields
        const numericFields = ['principal', 'subsidiary', 'typeOfInstrument', 'consideration', 'noOfCopy'];
        for (const field of numericFields) {
            const value = record[field];
            if (value !== undefined && value !== '' && isNaN(parseFloat(value))) {
                rowWarnings.push({
                    rowNumber,
                    fieldName: field,
                    errorType: 'INVALID_NUMBER',
                    message: `Non-numeric value for ${getFieldDisplayName(field)}: ${value}`
                });
            }
        }

        // Validate attachment exists in uploaded files
        if (record.attachment) {
            const filename = record.attachment.trim();
            const exists = attachmentFiles && attachmentFiles.has(filename);
            if (!exists) {
                rowErrors.push({
                    rowNumber,
                    fieldName: 'attachment',
                    errorType: 'MISSING_FILE',
                    message: `Attachment file not uploaded: ${filename}`
                });
            }
        } else {
            rowWarnings.push({
                rowNumber,
                fieldName: 'attachment',
                errorType: 'MISSING_ATTACHMENT',
                message: 'No attachment specified for this record'
            });
        }

        // Validate transferor based on type
        if (record.transferor) {
            const type = record.transferor.type;
            if (type === '0' || type === 0) {
                // Individual - check IC or Passport
                if (!record.transferor.icNo && !record.transferor.pasportNo) {
                    rowWarnings.push({
                        rowNumber,
                        fieldName: 'transferor.icNo',
                        errorType: 'MISSING_ID',
                        message: 'Individual transferor should have IC or Passport number'
                    });
                }
            } else if (type === '1' || type === 1) {
                // Company - check ROC
                if (!record.transferor.rocNo) {
                    rowWarnings.push({
                        rowNumber,
                        fieldName: 'transferor.rocNo',
                        errorType: 'MISSING_ID',
                        message: 'Company transferor should have ROC number'
                    });
                }
            }
        }

        // Validate transferee based on type
        if (record.transferee) {
            const type = record.transferee.type;
            if (type === '0' || type === 0) {
                if (!record.transferee.icNo && !record.transferee.pasportNo) {
                    rowWarnings.push({
                        rowNumber,
                        fieldName: 'transferee.icNo',
                        errorType: 'MISSING_ID',
                        message: 'Individual transferee should have IC or Passport number'
                    });
                }
            } else if (type === '1' || type === 1) {
                if (!record.transferee.rocNo) {
                    rowWarnings.push({
                        rowNumber,
                        fieldName: 'transferee.rocNo',
                        errorType: 'MISSING_ID',
                        message: 'Company transferee should have ROC number'
                    });
                }
            }
        }

        // Add to results
        errors.push(...rowErrors);
        warnings.push(...rowWarnings);

        if (rowErrors.length === 0) {
            validCount++;
        }
    }

    return {
        valid: errors.length === 0,
        validCount,
        errorCount: errors.length,
        warningCount: warnings.length,
        errors,
        warnings
    };
}

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to search
 * @param {string} path - Dot-notated path
 * @returns {*} Value at path
 */
function getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
        if (current === undefined || current === null) {
            return undefined;
        }
        current = current[part];
    }

    return current;
}

/**
 * Get display-friendly field name
 * @param {string} fieldPath - Field path
 * @returns {string} Display name
 */
function getFieldDisplayName(fieldPath) {
    const displayNames = {
        'refNo': 'Reference Number',
        'instrumentDate': 'Date Signed',
        'instrumentDateReceive': 'Date Received',
        'principal': 'Principal',
        'typeOfInstrument': 'Instrument Type',
        'transferor.type': 'Transferor Type',
        'transferor.name': 'Transferor Name',
        'transferor.icNo': 'Transferor IC',
        'transferor.rocNo': 'Transferor ROC',
        'transferee.type': 'Transferee Type',
        'transferee.name': 'Transferee Name',
        'transferee.icNo': 'Transferee IC',
        'transferee.rocNo': 'Transferee ROC',
        'consideration': 'Consideration Amount',
        'noOfCopy': 'Number of Copies',
        'attachment': 'Attachment'
    };

    return displayNames[fieldPath] || fieldPath;
}

export { MANDATORY_FIELDS };
