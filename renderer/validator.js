/**
 * Data Validation Module
 * Validates parsed data before XML generation
 */

import { sanitizeAttachmentName, isAllowedAttachmentExtension } from './generator.js';

// Party fields mandatory in both modes (identical transferor/transferee rules)
const PARTY_MANDATORY = (who) => [
    `${who}.type`,
    `${who}.name`,
    `${who}.street1`,
    `${who}.street2`,
    `${who}.postcode`,
    `${who}.city`,
    `${who}.state`,
    `${who}.country`,
    `${who}.telNo`
];

// Mandatory fields for Penyeteman Sekuriti (applicationType 43)
const MANDATORY_FIELDS_SEKURITI = [
    'refNo',
    'instrumentDate',
    'principal',
    'typeOfInstrumentOthers',
    ...PARTY_MANDATORY('transferor'),
    ...PARTY_MANDATORY('transferee'),
    // Instrument details (Wajib! per LHDN spec)
    'consideration',
    'duration'
];

// Mandatory fields for Penyeteman Am (applicationType 44)
// Am has no principal/consideration/duration. Per LHDN spec 2.2.2, the Am-only
// fields (remessionOrExemption/payment/aggrementInfo) are NOT marked Wajib, so
// they stay optional.
const MANDATORY_FIELDS_AM = [
    'refNo',
    'instrumentDate',
    'typeOfInstrumentOthers',
    ...PARTY_MANDATORY('transferor'),
    ...PARTY_MANDATORY('transferee')
];

// Date format regex
const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

/**
 * Validate all records
 * @param {Array} mappedData - Array of mapped record objects
 * @param {Map} attachmentFiles - Map of filename -> attachment data
 * @param {string} mode - 'sekuriti' (43) | 'am' (44). Defaults to 'sekuriti'.
 * @returns {Object} Validation results
 */
export async function validateAll(mappedData, attachmentFiles, mode = 'sekuriti') {
    const MANDATORY_FIELDS = mode === 'am' ? MANDATORY_FIELDS_AM : MANDATORY_FIELDS_SEKURITI;
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

            // LHDN filename rules (spec 2.3.5): .pdf/.jpeg/.png/.gif only, and
            // the portal parses the type from the NAME — extra dots/spaces get
            // rejected as "file type not compliant".
            if (!isAllowedAttachmentExtension(filename)) {
                rowErrors.push({
                    rowNumber,
                    fieldName: 'attachment',
                    errorType: 'INVALID_FILE_TYPE',
                    message: `File type not accepted by LHDN (allowed: .pdf, .jpeg, .png, .gif): ${filename}`
                });
            } else {
                const safeName = sanitizeAttachmentName(filename);
                if (safeName !== filename) {
                    rowWarnings.push({
                        rowNumber,
                        fieldName: 'attachment',
                        errorType: 'UNSAFE_FILENAME',
                        message: `Filename has spaces/extra dots/special characters — LHDN rejects these, so it will be submitted as: ${safeName}`
                    });
                }
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
                const hasPassport = record.transferor.pasportNo;

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
                    if (!record.transferor.pasportCountry) {
                        rowErrors.push({
                            rowNumber,
                            fieldName: 'transferor.pasportCountry',
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
                const hasPassport = record.transferee.pasportNo;

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
                    if (!record.transferee.pasportCountry) {
                        rowErrors.push({
                            rowNumber,
                            fieldName: 'transferee.pasportCountry',
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
        'transferor.pasportNo': 'Transferor Passport',
        'transferor.pasportCountry': 'Transferor Passport Country',
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
        'transferee.pasportNo': 'Transferee Passport',
        'transferee.pasportCountry': 'Transferee Passport Country',
        'transferee.street1': 'Transferee Address Line 1',
        'transferee.street2': 'Transferee Address Line 2',
        'transferee.postcode': 'Transferee Postcode',
        'transferee.city': 'Transferee City',
        'transferee.state': 'Transferee State',
        'transferee.country': 'Transferee Country',
        'transferee.telNo': 'Transferee Phone',

        // Other
        'consideration': 'Consideration Amount',
        'duration': 'Duration Fixed (1=Yes, 2=No)',
        'noOfCopy': 'Number of Copies',
        'attachment': 'Attachment'
    };

    return displayNames[fieldPath] || fieldPath;
}

export { MANDATORY_FIELDS_SEKURITI, MANDATORY_FIELDS_AM };
