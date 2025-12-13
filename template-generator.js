/**
 * STAMPS Bulk Generator - Excel Template Generator
 * Generates a template Excel file with all required column headers
 */

import XLSX from 'xlsx';

/**
 * Column definitions for the STAMPS template
 * Each column includes header name, XML mapping, data type, and example/notes
 */
export const TEMPLATE_COLUMNS = [
    // Basic Information
    { header: 'Ref No', xmlTag: '<refNo>', dataType: 'Text', example: 'REF001', notes: 'Unique reference number' },
    { header: 'Date Signed', xmlTag: '<instrumentDate>', dataType: 'Date (DD/MM/YYYY)', example: '15/12/2024', notes: 'Date instrument was signed' },
    { header: 'Date Received', xmlTag: '<instrumentDateReceive>', dataType: 'Date (DD/MM/YYYY)', example: '16/12/2024', notes: 'Date instrument was received' },
    { header: 'Principal (-1) / Sub (0)', xmlTag: '<principal>', dataType: 'Number', example: '-1', notes: '-1 = Principal, 0 = Subsidiary' },
    { header: 'Subsidiary Ref', xmlTag: '<subsidiary>', dataType: 'Number', example: '0', notes: 'Subsidiary reference number' },
    { header: 'Instrument Type Code', xmlTag: '<typeOfInstrument>', dataType: 'Number', example: '1', notes: 'Instrument type code' },
    { header: 'Other Instrument (Desc)', xmlTag: '<typeOfInstrumentOthers>', dataType: 'Text', example: '', notes: 'Description if Other type' },

    // TRANSFEROR (Pihak 1)
    { header: 'Transferor Type', xmlTag: '<transferor><type>', dataType: 'Number', example: '0', notes: '0=Individual, 1=Company' },
    { header: 'Transferor Name', xmlTag: '<transferor><name>', dataType: 'Text', example: 'ALI BIN ABU', notes: 'Full name/company name' },
    { header: 'Transferor Nationality', xmlTag: '<transferor><nationality>', dataType: 'Number', example: '1', notes: '1=Citizen, 2=Non-Citizen, 3=PR' },
    { header: 'Transferor IC', xmlTag: '<transferor><icNo>', dataType: 'Text', example: '800101145566', notes: 'IC number (no dashes)' },
    { header: 'Transferor Passport', xmlTag: '<transferor><pasportNo>', dataType: 'Text', example: '', notes: 'Passport number if non-citizen' },
    { header: 'Transferor Passport Country', xmlTag: '<transferor><pasportCountry>', dataType: 'Code', example: '', notes: 'Country code (e.g., SG, US)' },
    { header: 'Transferor ROC', xmlTag: '<transferor><rocNo>', dataType: 'Text', example: '', notes: 'Company registration number' },
    { header: 'Transferor Bus. Type', xmlTag: '<transferor><busType>', dataType: 'Number', example: '', notes: '1=Local, 2=Foreign' },
    { header: 'Transferor Income Tax', xmlTag: '<transferor><incomeTaxNo>', dataType: 'Text', example: '', notes: 'Income tax number' },
    { header: 'Transferor Branch Code', xmlTag: '<transferor><incomeTaxBranch>', dataType: 'Number', example: '', notes: 'Tax branch code' },
    { header: 'Transferor Address 1', xmlTag: '<transferor><street1>', dataType: 'Text', example: 'No. 10, Jalan 1/1', notes: 'Street address line 1' },
    { header: 'Transferor Address 2', xmlTag: '<transferor><street2>', dataType: 'Text', example: 'Taman ABC', notes: 'Street address line 2' },
    { header: 'Transferor Address 3', xmlTag: '<transferor><street3>', dataType: 'Text', example: '', notes: 'Street address line 3' },
    { header: 'Transferor Postcode', xmlTag: '<transferor><postcode>', dataType: 'Text', example: '50000', notes: 'Postcode' },
    { header: 'Transferor City', xmlTag: '<transferor><city>', dataType: 'Text', example: 'Kuala Lumpur', notes: 'City name' },
    { header: 'Transferor State Code', xmlTag: '<transferor><state>', dataType: 'Number', example: '14', notes: 'State code (1-16)' },
    { header: 'Transferor Country Code', xmlTag: '<transferor><country>', dataType: 'Number', example: '146', notes: 'Country code (146=Malaysia)' },
    { header: 'Transferor Phone', xmlTag: '<transferor><telNo>', dataType: 'Text', example: '0123456789', notes: 'Phone number' },
    { header: 'Transferor Email', xmlTag: '<transferor><email>', dataType: 'Text', example: 'ali@email.com', notes: 'Email address' },

    // TRANSFEREE (Pihak 2)
    { header: 'Transferee Type', xmlTag: '<transferee><type>', dataType: 'Number', example: '0', notes: '0=Individual, 1=Company' },
    { header: 'Transferee Name', xmlTag: '<transferee><name>', dataType: 'Text', example: 'SITI BINTI ABU', notes: 'Full name/company name' },
    { header: 'Transferee Nationality', xmlTag: '<transferee><nationality>', dataType: 'Number', example: '1', notes: '1=Citizen, 2=Non-Citizen, 3=PR' },
    { header: 'Transferee IC', xmlTag: '<transferee><icNo>', dataType: 'Text', example: '850202145577', notes: 'IC number (no dashes)' },
    { header: 'Transferee Passport', xmlTag: '<transferee><pasportNo>', dataType: 'Text', example: '', notes: 'Passport number if non-citizen' },
    { header: 'Transferee Passport Country', xmlTag: '<transferee><pasportCountry>', dataType: 'Code', example: '', notes: 'Country code (e.g., SG, US)' },
    { header: 'Transferee ROC', xmlTag: '<transferee><rocNo>', dataType: 'Text', example: '', notes: 'Company registration number' },
    { header: 'Transferee Bus. Type', xmlTag: '<transferee><busType>', dataType: 'Number', example: '', notes: '1=Local, 2=Foreign' },
    { header: 'Transferee Income Tax', xmlTag: '<transferee><incomeTaxNo>', dataType: 'Text', example: '', notes: 'Income tax number' },
    { header: 'Transferee Branch Code', xmlTag: '<transferee><incomeTaxBranch>', dataType: 'Number', example: '', notes: 'Tax branch code' },
    { header: 'Transferee Address 1', xmlTag: '<transferee><street1>', dataType: 'Text', example: 'No. 20, Jalan 2/2', notes: 'Street address line 1' },
    { header: 'Transferee Address 2', xmlTag: '<transferee><street2>', dataType: 'Text', example: 'Taman XYZ', notes: 'Street address line 2' },
    { header: 'Transferee Address 3', xmlTag: '<transferee><street3>', dataType: 'Text', example: '', notes: 'Street address line 3' },
    { header: 'Transferee Postcode', xmlTag: '<transferee><postcode>', dataType: 'Text', example: '50000', notes: 'Postcode' },
    { header: 'Transferee City', xmlTag: '<transferee><city>', dataType: 'Text', example: 'Kuala Lumpur', notes: 'City name' },
    { header: 'Transferee State Code', xmlTag: '<transferee><state>', dataType: 'Number', example: '14', notes: 'State code (1-16)' },
    { header: 'Transferee Country Code', xmlTag: '<transferee><country>', dataType: 'Number', example: '146', notes: 'Country code (146=Malaysia)' },
    { header: 'Transferee Phone', xmlTag: '<transferee><telNo>', dataType: 'Text', example: '0198765432', notes: 'Phone number' },
    { header: 'Transferee Email', xmlTag: '<transferee><email>', dataType: 'Text', example: 'siti@email.com', notes: 'Email address' },

    // DETAILS
    { header: 'Loan/Consideration Amt', xmlTag: '<consideration>', dataType: 'Number (14,2)', example: '100000.00', notes: 'Amount in RM' },
    { header: 'Duration Fixed?', xmlTag: '<duration>', dataType: 'Number', example: '1', notes: '1=Yes, 2=No' },
    { header: 'Duration Desc', xmlTag: '<durationDesc>', dataType: 'Text', example: '12 months', notes: 'Duration description' },
    { header: 'Collateral: Land?', xmlTag: '<colLand>', dataType: 'Number', example: '2', notes: '1=Yes, 2=No' },
    { header: 'Collateral: Land Desc', xmlTag: '<colLandDesc>', dataType: 'Text', example: '', notes: 'Land description if Yes' },
    { header: 'Collateral: Share?', xmlTag: '<colShare>', dataType: 'Number', example: '2', notes: '1=Yes, 2=No' },
    { header: 'Collateral: Deposit?', xmlTag: '<colDeposit>', dataType: 'Number', example: '2', notes: '1=Yes, 2=No' },
    { header: 'Collateral: Other?', xmlTag: '<colOthers>', dataType: 'Number', example: '2', notes: '1=Yes, 2=No' },
    { header: 'Collateral: Other Desc', xmlTag: '<colOthersDesc>', dataType: 'Text', example: '', notes: 'Other collateral description' },
    { header: 'No of Copies', xmlTag: '<noOfCopy>', dataType: 'Number', example: '1', notes: 'Number of copies' },
    { header: 'Exemption Code', xmlTag: '<exemption>', dataType: 'Text', example: '', notes: 'Exemption code if applicable' },
    { header: 'Exemption Others', xmlTag: '<exemptionOthers>', dataType: 'Text', example: '', notes: 'Exemption description' },
    { header: 'Remission Code', xmlTag: '<remession>', dataType: 'Text', example: '', notes: 'Remission code if applicable' },
    { header: 'Remission Others', xmlTag: '<remessionOthers>', dataType: 'Text', example: '', notes: 'Remission description' },

    // ATTACHMENT
    { header: 'Attachment Filename', xmlTag: '<attachment>', dataType: 'Text', example: 'document.pdf', notes: 'Filename in Attachments folder' }
];

/**
 * Generate Excel template buffer
 */
export function generateTemplate() {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // ========== DATA SHEET ==========
    // Headers only for the main data entry sheet
    const headers = TEMPLATE_COLUMNS.map(col => col.header);
    const exampleRow = TEMPLATE_COLUMNS.map(col => col.example);

    const dataSheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

    // Set column widths
    dataSheet['!cols'] = TEMPLATE_COLUMNS.map(col => ({
        wch: Math.max(col.header.length, 15)
    }));

    XLSX.utils.book_append_sheet(wb, dataSheet, 'Data Entry');

    // ========== REFERENCE SHEET ==========
    // Column reference guide
    const refHeaders = ['Column Header', 'XML Tag', 'Data Type', 'Example', 'Notes'];
    const refData = TEMPLATE_COLUMNS.map(col => [
        col.header,
        col.xmlTag,
        col.dataType,
        col.example,
        col.notes
    ]);

    const refSheet = XLSX.utils.aoa_to_sheet([refHeaders, ...refData]);
    refSheet['!cols'] = [
        { wch: 30 },
        { wch: 30 },
        { wch: 20 },
        { wch: 20 },
        { wch: 40 }
    ];

    XLSX.utils.book_append_sheet(wb, refSheet, 'Column Reference');

    // ========== CODES REFERENCE SHEET ==========
    const codesData = [
        ['CODE REFERENCE GUIDE', '', ''],
        ['', '', ''],
        ['STATE CODES', '', ''],
        ['Code', 'State', ''],
        ['1', 'Johor', ''],
        ['2', 'Kedah', ''],
        ['3', 'Kelantan', ''],
        ['4', 'Melaka', ''],
        ['5', 'Negeri Sembilan', ''],
        ['6', 'Pahang', ''],
        ['7', 'Pulau Pinang', ''],
        ['8', 'Perak', ''],
        ['9', 'Perlis', ''],
        ['10', 'Selangor', ''],
        ['11', 'Terengganu', ''],
        ['12', 'Sabah', ''],
        ['13', 'Sarawak', ''],
        ['14', 'Wilayah Persekutuan KL', ''],
        ['15', 'Wilayah Persekutuan Labuan', ''],
        ['16', 'Wilayah Persekutuan Putrajaya', ''],
        ['', '', ''],
        ['NATIONALITY CODES', '', ''],
        ['Code', 'Description', ''],
        ['1', 'Citizen (Warganegara)', ''],
        ['2', 'Non-Citizen (Bukan Warganegara)', ''],
        ['3', 'Permanent Resident (Pemastautin Tetap)', ''],
        ['', '', ''],
        ['PARTY TYPE CODES', '', ''],
        ['Code', 'Description', ''],
        ['0', 'Individual (Individu)', ''],
        ['1', 'Company (Syarikat)', ''],
        ['', '', ''],
        ['BUSINESS TYPE CODES', '', ''],
        ['Code', 'Description', ''],
        ['1', 'Local (Tempatan)', ''],
        ['2', 'Foreign (Asing)', ''],
        ['', '', ''],
        ['YES/NO CODES (Duration, Collateral)', '', ''],
        ['Code', 'Description', ''],
        ['1', 'Yes (Ya)', ''],
        ['2', 'No (Tidak)', ''],
        ['', '', ''],
        ['PRINCIPAL/SUBSIDIARY', '', ''],
        ['Code', 'Description', ''],
        ['-1', 'Principal', ''],
        ['0', 'Subsidiary', ''],
        ['', '', ''],
        ['COUNTRY CODE (Malaysia)', '', ''],
        ['458', 'Malaysia', '']
    ];

    const codesSheet = XLSX.utils.aoa_to_sheet(codesData);
    codesSheet['!cols'] = [
        { wch: 10 },
        { wch: 35 },
        { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, codesSheet, 'Code Reference');

    // ========== STATE CODES SHEET (LAMPIRAN E) ==========
    const stateCodesData = [
        ['LAMPIRAN E - STATE CODES (KOD NEGERI)', ''],
        ['Code', 'State Name'],
        ['1', 'Johor'],
        ['2', 'Kedah'],
        ['3', 'Kelantan'],
        ['4', 'Melaka'],
        ['5', 'Negeri Sembilan'],
        ['6', 'Pahang'],
        ['7', 'Perak'],
        ['8', 'Perlis'],
        ['9', 'Pulau Pinang'],
        ['10', 'Sabah'],
        ['11', 'Sarawak'],
        ['12', 'Selangor'],
        ['13', 'Terengganu'],
        ['14', 'Wilayah Persekutuan Kuala Lumpur'],
        ['15', 'Wilayah Persekutuan Labuan'],
        ['16', 'Wilayah Persekutuan Putrajaya'],
        ['17', 'Luar Negara (Foreign)']
    ];

    const stateCodesSheet = XLSX.utils.aoa_to_sheet(stateCodesData);
    stateCodesSheet['!cols'] = [{ wch: 10 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, stateCodesSheet, 'State Codes');

    // ========== LHDN BRANCH CODES SHEET (LAMPIRAN D) ==========
    const branchCodesData = [
        ['LAMPIRAN D - LHDN TAX BRANCH CODES (KOD CAWANGAN CUKAI LHDN)', ''],
        ['Code', 'Branch Name'],
        ['1', 'Johor Bahru'],
        ['2', 'Melaka'],
        ['3', 'Seremban'],
        ['4', 'Taiping'],
        ['5', 'Ipoh'],
        ['6', 'Teluk Intan'],
        ['7', 'Kota Bahru'],
        ['9', 'Pulau Pinang'],
        ['10', 'Kuantan'],
        ['12', 'Jalan Duta'],
        ['13', 'Kluang'],
        ['15', 'Kuala Terengganu'],
        ['16', 'Shah Alam'],
        ['17', 'Raub'],
        ['18', 'Kangar'],
        ['19', 'KL Bandar'],
        ['20', 'Bukit Mertajam'],
        ['21', 'Klang'],
        ['22', 'Alor Setar'],
        ['24', 'Muar'],
        ['25', 'Cheras'],
        ['26', 'Wangsa Maju'],
        ['27', 'Sungai Petani'],
        ['28', 'Petaling Jaya'],
        ['29', 'Temerloh'],
        ['30', 'Kota Kinabalu'],
        ['31', 'Sandakan'],
        ['32', 'Tawau'],
        ['33', 'Keningau'],
        ['40', 'Kuching'],
        ['41', 'Sibu'],
        ['42', 'Miri'],
        ['43', 'Bintulu'],
        ['51', 'Labuan'],
        ['52', 'Bangi']
    ];

    const branchCodesSheet = XLSX.utils.aoa_to_sheet(branchCodesData);
    branchCodesSheet['!cols'] = [{ wch: 10 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, branchCodesSheet, 'LHDN Branch Codes');

    // ========== COUNTRY CODES SHEET (LAMPIRAN C - Common) ==========
    const countryCodesData = [
        ['LAMPIRAN C - COUNTRY CODES (KOD NEGARA) - Common', ''],
        ['Code', 'Country Name'],
        ['146', 'MALAYSIA'],
        ['187', 'SINGAPORE'],
        ['99', 'INDIA'],
        ['43', 'CHINA'],
        ['95', 'INDONESIA'],
        ['204', 'THAILAND'],
        ['24', 'BRUNEI DARUSSALAM'],
        ['167', 'PHILIPPINE'],
        ['227', 'VIETNAM'],
        ['107', 'JAPAN'],
        ['250', 'REPUBLIC OF KOREA (SOUTH KOREA)'],
        ['73', 'UNITED KINGDOM'],
        ['219', 'UNITED STATES OF AMERICA'],
        ['11', 'AUSTRALIA'],
        ['89', 'HONG KONG'],
        ['214', 'TAIWAN'],
        ['265', 'CHINESE TAIPEI'],
        ['2', 'UNITED ARAB EMIRATES'],
        ['181', 'SAUDI ARABIA'],
        ['52', 'GERMANY'],
        ['71', 'FRANCE'],
        ['104', 'ITALY'],
        ['155', 'NETHERLANDS'],
        ['38', 'SWITZERLAND'],
        ['33', 'CANADA'],
        ['161', 'NEW ZEALAND'],
        ['', ''],
        ['Full list available in STAMPS documentation (LAMPIRAN C)', '']
    ];

    const countryCodesSheet = XLSX.utils.aoa_to_sheet(countryCodesData);
    countryCodesSheet['!cols'] = [{ wch: 10 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, countryCodesSheet, 'Country Codes');

    // ========== INSTRUCTIONS SHEET ==========
    const instructionsData = [
        ['STAMPS BULK GENERATOR - TEMPLATE INSTRUCTIONS'],
        [''],
        ['HOW TO USE THIS TEMPLATE:'],
        ['1. Enter your data in the "Data Entry" sheet'],
        ['2. Use the "Column Reference" sheet to understand each field'],
        ['3. Use the "Code Reference" sheets for valid code values:'],
        ['   - State Codes: LAMPIRAN E'],
        ['   - LHDN Branch Codes: LAMPIRAN D'],
        ['   - Country Codes: LAMPIRAN C (Common codes provided)'],
        ['4. Save this file as .xlsx format'],
        ['5. Upload your attachment files (PDF/JPG) when prompted'],
        ['6. Use the STAMPS Bulk Generator app to process this file'],
        [''],
        ['IMPORTANT NOTES:'],
        ['• Date format must be DD/MM/YYYY (e.g., 15/12/2024)'],
        ['• IC Number should not contain dashes (e.g., 800101145566)'],
        ['• Consideration amount should be numeric (e.g., 100000.00)'],
        ['• Malaysia country code is 146 (not 458)'],
        ['• Application Type (43) is automatically added by the system'],
        [''],
        ['REQUIRED FIELDS:'],
        ['• Ref No'],
        ['• Date Signed'],
        ['• Date Received'],
        ['• Principal/Sub'],
        ['• Instrument Type Code'],
        ['• Transferor Type, Name, IC (or Passport for non-citizens)'],
        ['• Transferee Type, Name, IC (or Passport for non-citizens)'],
        ['• Consideration Amount'],
        ['• Number of Copies']
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 70 }];

    XLSX.utils.book_append_sheet(wb, instructionsSheet, 'Instructions');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return buffer;
}
