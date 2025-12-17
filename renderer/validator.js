/**
 * Data Validation Module
 * Validates parsed data before XML generation
 */

// Mandatory fields that must have values
const MANDATORY_FIELDS = [
    // Instrument Information
    'refNo',
    'instrumentDate',
    'principal',
    'typeOfInstrumentOthers',

    // Transferor (Provider) - Basic Info
    'transferor.type',
    'transferor.name',

    // Transferor - Address & Contact
    'transferor.street1',
    'transferor.street2',
    'transferor.postcode',
    'transferor.city',
    'transferor.state',
    'transferor.country',
    'transferor.telNo',

    // Transferee (Recipient) - Basic Info
    'transferee.type',
    'transferee.name',

    // Transferee - Address & Contact
    'transferee.street1',
    'transferee.street2',
    'transferee.postcode',
    'transferee.city',
    'transferee.state',
    'transferee.country',
    'transferee.telNo'
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
            if (type === '1' || type === 1) {
                // Company - require ROC and Business Type
                if (!record.transferor.rocNo) {
                    rowErrors.push({
                        rowNumber,
                        fieldName: 'transferor.rocNo',
                        errorType: 'MISSING_FIELD',
                        message: 'Company transferor requires ROC Number'
                    });
                }
                if (!record.transferor.busType) {
                    rowErrors.push({
                        rowNumber,
                        fieldName: 'transferor.busType',
                        errorType: 'MISSING_FIELD',
                        message: 'Company transferor requires Business Type (1=Local, 2=Foreign)'
                    });
                }
            } else if (type === '0' || type === 0) {
                // Individual - check if citizen (has IC) or non-citizen (has passport)
                const hasIC = record.transferor.icNo;
                const hasPassport = record.transferor.passportNo;

                if (!hasIC && !hasPassport) {
                    rowErrors.push({
                        rowNumber,
                        fieldName: 'transferor.icNo',
                        errorType: 'MISSING_FIELD',
                        message: 'Individual transferor requires IC Number (citizen) or Passport (non-citizen)'
                    });
                } else if (hasIC) {
                    // Citizen - require nationality
                    if (!record.transferor.nationality) {
                        rowErrors.push({
                            rowNumber,
                            fieldName: 'transferor.nationality',
                            errorType: 'MISSING_FIELD',
                            message: 'Citizen transferor requires Nationality (set to 1)'
                        });
                    }
                } else if (hasPassport) {
                    // Non-citizen - require passport country
                    if (!record.transferor.passportCountry) {
                        rowErrors.push({
                            rowNumber,
                            fieldName: 'transferor.passportCountry',
                            errorType: 'MISSING_FIELD',
                            message: 'Non-citizen transferor requires Passport Country Code'
                        });
                    }
                }
            }
        }

        // Validate transferee based on type
        if (record.transferee) {
            const type = record.transferee.type;
            if (type === '1' || type === 1) {
                // Company - require ROC and Business Type
                if (!record.transferee.rocNo) {
                    rowErrors.push({
                        rowNumber,
                        fieldName: 'transferee.rocNo',
                        errorType: 'MISSING_FIELD',
                        message: 'Company transferee requires ROC Number'
                    });
                }
                if (!record.transferee.busType) {
                    rowErrors.push({
                        rowNumber,
                        fieldName: 'transferee.busType',
                        errorType: 'MISSING_FIELD',
                        message: 'Company transferee requires Business Type (1=Local, 2=Foreign)'
                    });
                }
            } else if (type === '0' || type === 0) {
                // Individual - check if citizen (has IC) or non-citizen (has passport)
                const hasIC = record.transferee.icNo;
                const hasPassport = record.transferee.passportNo;

                if (!hasIC && !hasPassport) {
                    rowErrors.push({
                        rowNumber,
                        fieldName: 'transferee.icNo',
                        errorType: 'MISSING_FIELD',
                        message: 'Individual transferee requires IC Number (citizen) or Passport (non-citizen)'
                    });
                } else if (hasIC) {
                    // Citizen - require nationality
                    if (!record.transferee.nationality) {
                        rowErrors.push({
                            rowNumber,
                            fieldName: 'transferee.nationality',
                            errorType: 'MISSING_FIELD',
                            message: 'Citizen transferee requires Nationality (set to 1)'
                        });
                    }
                } else if (hasPassport) {
                    // Non-citizen - require passport country
                    if (!record.transferee.passportCountry) {
                        rowErrors.push({
                            rowNumber,
                            fieldName: 'transferee.passportCountry',
                            errorType: 'MISSING_FIELD',
                            message: 'Non-citizen transferee requires Passport Country Code'
                        });
                    }
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
        // Instrument Information
        'refNo': 'Reference Number',
        'instrumentDate': 'Date Signed',
        'instrumentDateReceive': 'Date Received',
        'principal': 'Principal/Subsidiary',
        'typeOfInstrumentOthers': 'Agreement Name',
        'typeOfInstrument': 'Instrument Type',

        // Transferor
        'transferor.type': 'Transferor Type',
        'transferor.name': 'Transferor Name',
        'transferor.icNo': 'Transferor IC',
        'transferor.rocNo': 'Transferor ROC',
        'transferor.busType': 'Transferor Business Type',
        'transferor.nationality': 'Transferor Nationality',
        'transferor.passportNo': 'Transferor Passport',
        'transferor.passportCountry': 'Transferor Passport Country',
        'transferor.street1': 'Transferor Address Line 1',
        'transferor.street2': 'Transferor Address Line 2',
        'transferor.postcode': 'Transferor Postcode',
        'transferor.city': 'Transferor City',
        'transferor.state': 'Transferor State',
        'transferor.country': 'Transferor Country',
        'transferor.telNo': 'Transferor Phone',

        // Transferee
        'transferee.type': 'Transferee Type',
        'transferee.name': 'Transferee Name',
        'transferee.icNo': 'Transferee IC',
        'transferee.rocNo': 'Transferee ROC',
        'transferee.busType': 'Transferee Business Type',
        'transferee.nationality': 'Transferee Nationality',
        'transferee.passportNo': 'Transferee Passport',
        'transferee.passportCountry': 'Transferee Passport Country',
        'transferee.street1': 'Transferee Address Line 1',
        'transferee.street2': 'Transferee Address Line 2',
        'transferee.postcode': 'Transferee Postcode',
        'transferee.city': 'Transferee City',
        'transferee.state': 'Transferee State',
        'transferee.country': 'Transferee Country',
        'transferee.telNo': 'Transferee Phone',

        // Other
        'consideration': 'Consideration Amount',
        'noOfCopy': 'Number of Copies',
        'attachment': 'Attachment'
    };

    return displayNames[fieldPath] || fieldPath;
}

export { MANDATORY_FIELDS };
