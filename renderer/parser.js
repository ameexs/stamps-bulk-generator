/**
 * Excel/CSV Parser Module
 * Parses data files and maps columns to XML field structure
 */

// XLSX is loaded via script tag in index.html
// This module uses window.XLSX
let XLSX = null;

async function loadXLSX() {
    if (!XLSX) {
        // Wait for XLSX to be available (loaded via script tag)
        if (typeof window !== 'undefined' && window.XLSX) {
            XLSX = window.XLSX;
        } else {
            // Wait a bit and retry (script might still be loading)
            await new Promise(resolve => setTimeout(resolve, 100));
            if (window.XLSX) {
                XLSX = window.XLSX;
            } else {
                throw new Error('XLSX library not loaded. Please refresh the page.');
            }
        }
    }
    return XLSX;
}

// Column mapping: Excel Header -> XML Tag Path
const COLUMN_MAP = {
    'Ref No': 'refNo',
    'Date Signed': 'instrumentDate',
    'Date Received': 'instrumentDateReceive',
    'Principal (-1) / Sub (0)': 'principal',
    'Subsidiary Ref': 'subsidiary',
    'Instrument Type Code': 'typeOfInstrument',
    'Other Instrument (Desc)': 'typeOfInstrumentOthers',

    // Transferor fields
    'Transferor Type': 'transferor.type',
    'Transferor Name': 'transferor.name',
    'Transferor Nationality': 'transferor.nationality',
    'Transferor IC': 'transferor.icNo',
    'Transferor Passport': 'transferor.pasportNo',
    'Transferor Passport Country': 'transferor.pasportCountry',
    'Transferor ROC': 'transferor.rocNo',
    'Transferor Bus. Type': 'transferor.busType',
    'Transferor Income Tax': 'transferor.incomeTaxNo',
    'Transferor Branch Code': 'transferor.incomeTaxBranch',
    'Transferor Address 1': 'transferor.street1',
    'Transferor Address 2': 'transferor.street2',
    'Transferor Address 3': 'transferor.street3',
    'Transferor Postcode': 'transferor.postcode',
    'Transferor City': 'transferor.city',
    'Transferor State Code': 'transferor.state',
    'Transferor Country Code': 'transferor.country',
    'Transferor Phone': 'transferor.telNo',
    'Transferor Email': 'transferor.email',

    // Transferee fields
    'Transferee Type': 'transferee.type',
    'Transferee Name': 'transferee.name',
    'Transferee Nationality': 'transferee.nationality',
    'Transferee IC': 'transferee.icNo',
    'Transferee Passport': 'transferee.pasportNo',
    'Transferee Passport Country': 'transferee.pasportCountry',
    'Transferee ROC': 'transferee.rocNo',
    'Transferee Bus. Type': 'transferee.busType',
    'Transferee Income Tax': 'transferee.incomeTaxNo',
    'Transferee Branch Code': 'transferee.incomeTaxBranch',
    'Transferee Address 1': 'transferee.street1',
    'Transferee Address 2': 'transferee.street2',
    'Transferee Address 3': 'transferee.street3',
    'Transferee Postcode': 'transferee.postcode',
    'Transferee City': 'transferee.city',
    'Transferee State Code': 'transferee.state',
    'Transferee Country Code': 'transferee.country',
    'Transferee Phone': 'transferee.telNo',
    'Transferee Email': 'transferee.email',

    // Details
    'Loan/Consideration Amt': 'consideration',
    'Duration Fixed?': 'duration',
    'Duration Desc': 'durationDesc',
    'Collateral: Land?': 'colLand',
    'Collateral: Land Desc': 'colLandDesc',
    'Collateral: Share?': 'colShare',
    'Collateral: Deposit?': 'colDeposit',
    'Collateral: Other?': 'colOthers',
    'Collateral: Other Desc': 'colOthersDesc',
    'No of Copies': 'noOfCopy',
    'Exemption Code': 'exemption',
    'Exemption Others': 'exemptionOthers',
    'Remission Code': 'remession',
    'Remission Others': 'remessionOthers',

    // Attachment
    'Filename Only': 'attachment',
    'Attachment': 'attachment',
    'Attachment Filename': 'attachment'
};

/**
 * Parse Excel or CSV file buffer
 * @param {ArrayBuffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @returns {Object} Parsed data with headers and rows
 */
export async function parseFile(buffer, filename) {
    await loadXLSX();

    const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true,
        dateNF: 'dd/mm/yyyy'
    });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON array
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: ''
    });

    if (jsonData.length === 0) {
        return { headers: [], rows: [], mappedData: [] };
    }

    // Get headers from first row
    const headers = Object.keys(jsonData[0]);

    // Map data to XML structure
    const mappedData = jsonData.map((row, index) => {
        const mapped = {
            _rowNumber: index + 2, // Excel row (1-indexed + header)
            _originalRow: row,
            transferor: {},
            transferee: {}
        };

        for (const [excelHeader, xmlPath] of Object.entries(COLUMN_MAP)) {
            if (row.hasOwnProperty(excelHeader)) {
                let value = row[excelHeader];

                // Handle date formatting
                if (excelHeader.includes('Date') && value) {
                    value = formatDate(value);
                }

                // Set nested or flat property
                if (xmlPath.includes('.')) {
                    const [parent, child] = xmlPath.split('.');
                    mapped[parent][child] = value;
                } else {
                    mapped[xmlPath] = value;
                }
            }
        }

        return mapped;
    });

    return {
        headers,
        rows: jsonData,
        mappedData
    };
}

/**
 * Format date to DD/MM/YYYY
 * @param {string|Date} value - Date value
 * @returns {string} Formatted date
 */
function formatDate(value) {
    if (!value) return '';

    // If already in DD/MM/YYYY format
    if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        return value;
    }

    // Try to parse date
    let date;
    if (value instanceof Date) {
        date = value;
    } else {
        // Try various formats
        date = new Date(value);
    }

    if (isNaN(date.getTime())) {
        return value; // Return original if can't parse
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Get display headers for preview table
 * @returns {string[]} Array of important headers
 */
export function getPreviewHeaders() {
    return [
        'Row',
        'Ref No',
        'Date Signed',
        'Transferor Name',
        'Transferee Name',
        'Consideration',
        'Attachment'
    ];
}

/**
 * Get preview row data
 * @param {Object} mappedRow - Mapped row data
 * @returns {Object} Preview row data
 */
export function getPreviewRow(mappedRow) {
    return {
        row: mappedRow._rowNumber,
        refNo: mappedRow.refNo || '-',
        dateSigned: mappedRow.instrumentDate || '-',
        transferorName: mappedRow.transferor?.name || '-',
        transfereeName: mappedRow.transferee?.name || '-',
        consideration: mappedRow.consideration || '-',
        attachment: mappedRow.attachment || '-'
    };
}

export { COLUMN_MAP };
