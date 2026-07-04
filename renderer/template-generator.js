/**
 * STAMPS Bulk Generator - Excel Template Generator
 * Generates a professionally styled template Excel file (coloured headers,
 * borders, zebra striping, autofilter) with all required columns + reference
 * sheets. Uses xlsx-js-style (window.XLSXStyle) so cell styles are written.
 */

(function () {
// Prefer the styling-capable build in the browser; fall back to plain xlsx.
const XLSX = (typeof window !== 'undefined' && (window.XLSXStyle || window.XLSX))
    ? (window.XLSXStyle || window.XLSX)
    : (typeof require !== 'undefined' ? require('xlsx') : null);

/* ============================================================
   Style palette + helpers
   ============================================================ */
const COLOR = {
    brand: '667EEA',
    brandDeep: '764BA2',
    headerBorder: '4A54B8',
    white: 'FFFFFF',
    exampleFill: 'EEF0FB',
    exampleText: '8A8FA3',
    exampleBorder: 'E1E4F2',
    sectionFill: 'E6E9FB',
    sectionText: '3A3F7A',
    subHeadFill: 'C7CEF3',
    subHeadText: '2A2E5A',
    zebraFill: 'F7F8FD',
    cellBorder: 'D9DCEC',
    noteText: '5A6072'
};

const solid = (rgb) => ({ patternType: 'solid', fgColor: { rgb } });
const borders = (rgb = COLOR.cellBorder) => ({
    top: { style: 'thin', color: { rgb } },
    bottom: { style: 'thin', color: { rgb } },
    left: { style: 'thin', color: { rgb } },
    right: { style: 'thin', color: { rgb } }
});

const STYLE = {
    header: {
        fill: solid(COLOR.brand),
        font: { bold: true, color: { rgb: COLOR.white }, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borders(COLOR.headerBorder)
    },
    example: {
        fill: solid(COLOR.exampleFill),
        font: { italic: true, color: { rgb: COLOR.exampleText }, sz: 10 },
        alignment: { vertical: 'center' },
        border: borders(COLOR.exampleBorder)
    },
    title: {
        fill: solid(COLOR.brandDeep),
        font: { bold: true, color: { rgb: COLOR.white }, sz: 13 },
        alignment: { vertical: 'center' }
    },
    section: {
        fill: solid(COLOR.sectionFill),
        font: { bold: true, color: { rgb: COLOR.sectionText }, sz: 11 },
        alignment: { vertical: 'center' }
    },
    subHead: {
        fill: solid(COLOR.subHeadFill),
        font: { bold: true, color: { rgb: COLOR.subHeadText }, sz: 10 },
        alignment: { vertical: 'center' },
        border: borders()
    },
    cell: {
        font: { sz: 10, color: { rgb: '333333' } },
        alignment: { vertical: 'center' },
        border: borders()
    },
    zebra: {
        fill: solid(COLOR.zebraFill),
        font: { sz: 10, color: { rgb: '333333' } },
        alignment: { vertical: 'center' },
        border: borders()
    },
    note: {
        font: { sz: 10, color: { rgb: COLOR.noteText } },
        alignment: { vertical: 'center', wrapText: true },
        border: borders()
    },
    instrTitle: {
        font: { bold: true, color: { rgb: COLOR.brandDeep }, sz: 14 }
    },
    instrHead: {
        font: { bold: true, color: { rgb: COLOR.sectionText }, sz: 11 }
    },
    instrBody: {
        font: { sz: 10, color: { rgb: '333333' } }
    }
};

// Ensure a cell object exists so we can attach a style, then set the style.
function setStyle(ws, r, c, style) {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = style;
}

// Style an entire row across `ncols` columns.
function styleRow(ws, r, ncols, style) {
    for (let c = 0; c < ncols; c++) setStyle(ws, r, c, style);
}

/* ============================================================
   Column definitions
   ============================================================ */
const TEMPLATE_COLUMNS_SEKURITI = [
    // Basic Information
    { header: 'Ref No', xmlTag: '<refNo>', dataType: 'Text', example: 'REF001', notes: 'Unique reference number' },
    { header: 'Date Signed', xmlTag: '<instrumentDate>', dataType: 'Date (DD/MM/YYYY)', example: '15/12/2024', notes: 'Date instrument was signed' },
    { header: 'Date Received', xmlTag: '<instrumentDateReceive>', dataType: 'Date (DD/MM/YYYY)', example: '16/12/2024', notes: 'Date instrument was received' },
    { header: 'Principal (-1) / Sub (0)', xmlTag: '<principal>', dataType: 'Number', example: '-1', notes: '-1 = Principal, 0 = Subsidiary' },
    { header: 'Subsidiary Ref', xmlTag: '<subsidiary>', dataType: 'Number', example: '0', notes: 'Subsidiary reference number' },
    { header: 'Instrument Type Code', xmlTag: '<typeOfInstrument>', dataType: 'Number', example: '1', notes: 'Instrument type code' },
    { header: 'Other Instrument (Desc)', xmlTag: '<typeOfInstrumentOthers>', dataType: 'Text', example: 'Loan Agreement', notes: 'Required: name/description of the instrument' },

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
    { header: 'Attachment Filename', xmlTag: '<attachment>', dataType: 'Text', example: '', notes: 'Optional: PDF/JPG filename you upload in the next step' }
];

// Penyeteman Am (applicationType 44) template — no principal/subsidiary/
// consideration/duration/collateral. Reuses the shared party columns and adds
// the Am-only fields (definitions per LHDN spec section 2.2.2).
const TEMPLATE_COLUMNS_AM = [
    TEMPLATE_COLUMNS_SEKURITI[0],            // Ref No
    TEMPLATE_COLUMNS_SEKURITI[1],            // Date Signed
    TEMPLATE_COLUMNS_SEKURITI[2],            // Date Received
    { header: 'Instrument Type Code', xmlTag: '<typeOfInstrument>', dataType: 'Text', example: '', notes: 'Jenis Suratcara (instrument type)' },
    { header: 'Other Instrument (Desc)', xmlTag: '<typeOfInstrumentOthers>', dataType: 'Text', example: 'Tenancy Agreement', notes: 'Required: agreement name/title (Nama Perjanjian)' },
    ...TEMPLATE_COLUMNS_SEKURITI.slice(7, 45), // Transferor + Transferee blocks
    { header: 'No of Copies', xmlTag: '<noOfCopy>', dataType: 'Number', example: '1', notes: 'Bilangan Salinan (number of copies)' },
    { header: 'Remission/Exemption', xmlTag: '<remessionOrExemption>', dataType: 'Text', example: '', notes: 'Pengecualian/Peremitan (exemption/remission), max 100' },
    { header: 'Payment', xmlTag: '<payment>', dataType: 'Number', example: '', notes: 'Bayaran/Balasan (RM) - payment/consideration amount' },
    { header: 'Agreement Info', xmlTag: '<aggrementInfo>', dataType: 'Text', example: '', notes: 'Maklumat Perjanjian (agreement details), max 500' },
    TEMPLATE_COLUMNS_SEKURITI[59]            // Attachment Filename
];

const TEMPLATE_COLUMNS_BY_MODE = {
    sekuriti: TEMPLATE_COLUMNS_SEKURITI,
    am: TEMPLATE_COLUMNS_AM
};

/* ============================================================
   Sheet builders (styled)
   ============================================================ */

// Main data entry sheet: coloured header, styled example row, autofilter.
function buildDataSheet(cols) {
    const headers = cols.map(c => c.header);
    const exampleRow = cols.map(c => c.example);
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

    ws['!cols'] = cols.map(c => ({ wch: Math.max(c.header.length + 2, 16) }));
    ws['!rows'] = [{ hpt: 26 }, { hpt: 18 }];
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: cols.length - 1 } }) };
    // Freeze the header row (ignored by viewers that don't support panes).
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };

    styleRow(ws, 0, cols.length, STYLE.header);
    styleRow(ws, 1, cols.length, STYLE.example);
    return ws;
}

// Column reference: styled header + zebra body, wrapped notes column.
function buildReferenceSheet(cols) {
    const refHeaders = ['Column Header', 'XML Tag', 'Data Type', 'Example', 'Notes'];
    const refData = cols.map(c => [c.header, c.xmlTag, c.dataType, c.example, c.notes]);
    const ws = XLSX.utils.aoa_to_sheet([refHeaders, ...refData]);
    ws['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 46 }];
    ws['!rows'] = [{ hpt: 22 }];
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }) };

    styleRow(ws, 0, 5, STYLE.header);
    for (let r = 1; r <= refData.length; r++) {
        const base = (r % 2 === 0) ? STYLE.zebra : STYLE.cell;
        for (let c = 0; c < 5; c++) {
            setStyle(ws, r, c, c === 4 ? Object.assign({}, STYLE.note, base.fill ? { fill: base.fill } : {}) : base);
        }
    }
    return ws;
}

// Reference tables (State / Branch / Country): title row + header + zebra body.
function buildLookupSheet(title, headerRow, dataRows, colWidths) {
    const aoa = [[title, ''], headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = colWidths;
    ws['!rows'] = [{ hpt: 26 }, { hpt: 20 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colWidths.length - 1 } }];

    styleRow(ws, 0, colWidths.length, STYLE.title);
    styleRow(ws, 1, colWidths.length, STYLE.subHead);
    for (let r = 2; r < aoa.length; r++) {
        styleRow(ws, r, colWidths.length, (r % 2 === 0) ? STYLE.cell : STYLE.zebra);
    }
    return ws;
}

/* ============================================================
   Main entry point
   ============================================================ */
function generateTemplate(mode = 'sekuriti') {
    const cols = TEMPLATE_COLUMNS_BY_MODE[mode] || TEMPLATE_COLUMNS_SEKURITI;
    const wb = XLSX.utils.book_new();

    // ---- Data Entry ----
    XLSX.utils.book_append_sheet(wb, buildDataSheet(cols), 'Data Entry');

    // ---- Column Reference ----
    XLSX.utils.book_append_sheet(wb, buildReferenceSheet(cols), 'Column Reference');

    // ---- Code Reference (grouped) ----
    const codesData = [
        ['CODE REFERENCE GUIDE', '', ''],
        ['', '', ''],
        ['STATE CODES', '', ''],
        ['Code', 'State', ''],
        ['1', 'Johor', ''], ['2', 'Kedah', ''], ['3', 'Kelantan', ''], ['4', 'Melaka', ''],
        ['5', 'Negeri Sembilan', ''], ['6', 'Pahang', ''], ['7', 'Perak', ''], ['8', 'Perlis', ''],
        ['9', 'Pulau Pinang', ''], ['10', 'Sabah', ''], ['11', 'Sarawak', ''], ['12', 'Selangor', ''],
        ['13', 'Terengganu', ''], ['14', 'Wilayah Persekutuan KL', ''],
        ['15', 'Wilayah Persekutuan Labuan', ''], ['16', 'Wilayah Persekutuan Putrajaya', ''],
        ['', '', ''],
        ['NATIONALITY CODES', '', ''],
        ['Code', 'Description', ''],
        ['1', 'Citizen (Warganegara)', ''], ['2', 'Non-Citizen (Bukan Warganegara)', ''],
        ['3', 'Permanent Resident (Pemastautin Tetap)', ''],
        ['', '', ''],
        ['PARTY TYPE CODES', '', ''],
        ['Code', 'Description', ''],
        ['0', 'Individual (Individu)', ''], ['1', 'Company (Syarikat)', ''],
        ['', '', ''],
        ['BUSINESS TYPE CODES', '', ''],
        ['Code', 'Description', ''],
        ['1', 'Local (Tempatan)', ''], ['2', 'Foreign (Asing)', ''],
        ['', '', ''],
        ['YES/NO CODES (Duration, Collateral)', '', ''],
        ['Code', 'Description', ''],
        ['1', 'Yes (Ya)', ''], ['2', 'No (Tidak)', ''],
        ['', '', ''],
        ['PRINCIPAL/SUBSIDIARY', '', ''],
        ['Code', 'Description', ''],
        ['-1', 'Principal', ''], ['0', 'Subsidiary', ''],
        ['', '', ''],
        ['COUNTRY CODE (Malaysia)', '', ''],
        ['146', 'Malaysia', '']
    ];
    const codesSheet = XLSX.utils.aoa_to_sheet(codesData);
    codesSheet['!cols'] = [{ wch: 12 }, { wch: 38 }, { wch: 16 }];
    codesSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    codesSheet['!rows'] = [{ hpt: 26 }];
    // Title + section/subhead heuristics
    const SECTION_TITLES = new Set(['STATE CODES', 'NATIONALITY CODES', 'PARTY TYPE CODES',
        'BUSINESS TYPE CODES', 'YES/NO CODES (Duration, Collateral)', 'PRINCIPAL/SUBSIDIARY',
        'COUNTRY CODE (Malaysia)']);
    styleRow(codesSheet, 0, 3, STYLE.title);
    for (let r = 1; r < codesData.length; r++) {
        const a = codesData[r][0];
        if (SECTION_TITLES.has(a)) styleRow(codesSheet, r, 3, STYLE.section);
        else if (a === 'Code') styleRow(codesSheet, r, 3, STYLE.subHead);
        else if (a !== '') { setStyle(codesSheet, r, 0, STYLE.cell); setStyle(codesSheet, r, 1, STYLE.cell); }
    }
    XLSX.utils.book_append_sheet(wb, codesSheet, 'Code Reference');

    // ---- State Codes (LAMPIRAN E) ----
    XLSX.utils.book_append_sheet(wb, buildLookupSheet(
        'LAMPIRAN E - STATE CODES (KOD NEGERI)',
        ['Code', 'State Name'],
        [
            ['1', 'Johor'], ['2', 'Kedah'], ['3', 'Kelantan'], ['4', 'Melaka'],
            ['5', 'Negeri Sembilan'], ['6', 'Pahang'], ['7', 'Perak'], ['8', 'Perlis'],
            ['9', 'Pulau Pinang'], ['10', 'Sabah'], ['11', 'Sarawak'], ['12', 'Selangor'],
            ['13', 'Terengganu'], ['14', 'Wilayah Persekutuan Kuala Lumpur'],
            ['15', 'Wilayah Persekutuan Labuan'], ['16', 'Wilayah Persekutuan Putrajaya'],
            ['17', 'Luar Negara (Foreign)']
        ],
        [{ wch: 10 }, { wch: 42 }]
    ), 'State Codes');

    // ---- LHDN Branch Codes (LAMPIRAN D) ----
    XLSX.utils.book_append_sheet(wb, buildLookupSheet(
        'LAMPIRAN D - LHDN TAX BRANCH CODES (KOD CAWANGAN CUKAI LHDN)',
        ['Code', 'Branch Name'],
        [
            ['1', 'Johor Bahru'], ['2', 'Melaka'], ['3', 'Seremban'], ['4', 'Taiping'],
            ['5', 'Ipoh'], ['6', 'Teluk Intan'], ['7', 'Kota Bahru'], ['9', 'Pulau Pinang'],
            ['10', 'Kuantan'], ['12', 'Jalan Duta'], ['13', 'Kluang'], ['15', 'Kuala Terengganu'],
            ['16', 'Shah Alam'], ['17', 'Raub'], ['18', 'Kangar'], ['19', 'KL Bandar'],
            ['20', 'Bukit Mertajam'], ['21', 'Klang'], ['22', 'Alor Setar'], ['24', 'Muar'],
            ['25', 'Cheras'], ['26', 'Wangsa Maju'], ['27', 'Sungai Petani'], ['28', 'Petaling Jaya'],
            ['29', 'Temerloh'], ['30', 'Kota Kinabalu'], ['31', 'Sandakan'], ['32', 'Tawau'],
            ['33', 'Keningau'], ['40', 'Kuching'], ['41', 'Sibu'], ['42', 'Miri'],
            ['43', 'Bintulu'], ['51', 'Labuan'], ['52', 'Bangi']
        ],
        [{ wch: 10 }, { wch: 42 }]
    ), 'LHDN Branch Codes');

    // ---- Country Codes (LAMPIRAN C - common) ----
    XLSX.utils.book_append_sheet(wb, buildLookupSheet(
        'LAMPIRAN C - COUNTRY CODES (KOD NEGARA) - Common',
        ['Code', 'Country Name'],
        [
            ['146', 'MALAYSIA'], ['187', 'SINGAPORE'], ['99', 'INDIA'], ['43', 'CHINA'],
            ['95', 'INDONESIA'], ['204', 'THAILAND'], ['24', 'BRUNEI DARUSSALAM'], ['167', 'PHILIPPINE'],
            ['227', 'VIETNAM'], ['107', 'JAPAN'], ['250', 'REPUBLIC OF KOREA (SOUTH KOREA)'],
            ['73', 'UNITED KINGDOM'], ['219', 'UNITED STATES OF AMERICA'], ['11', 'AUSTRALIA'],
            ['89', 'HONG KONG'], ['214', 'TAIWAN'], ['265', 'CHINESE TAIPEI'], ['2', 'UNITED ARAB EMIRATES'],
            ['181', 'SAUDI ARABIA'], ['52', 'GERMANY'], ['71', 'FRANCE'], ['104', 'ITALY'],
            ['155', 'NETHERLANDS'], ['38', 'SWITZERLAND'], ['33', 'CANADA'], ['161', 'NEW ZEALAND'],
            ['', 'Full list in STAMPS documentation (LAMPIRAN C)']
        ],
        [{ wch: 10 }, { wch: 52 }]
    ), 'Country Codes');

    // ---- Instructions ----
    const instructionsData = [
        ['STAMPS BULK GENERATOR - TEMPLATE INSTRUCTIONS'],
        [''],
        ['HOW TO USE THIS TEMPLATE:'],
        ['1. Enter your data in the "Data Entry" sheet (replace the grey example row).'],
        ['2. Use the "Column Reference" sheet to understand each field.'],
        ['3. Use the code sheets for valid values: State Codes, LHDN Branch Codes, Country Codes.'],
        ['4. Save this file as .xlsx format.'],
        ['5. Upload your attachment files (PDF/JPG) when prompted in the app.'],
        ['6. Run the STAMPS Bulk Generator app to validate and generate your XML.'],
        [''],
        ['IMPORTANT NOTES:'],
        ['- Date format must be DD/MM/YYYY (e.g., 15/12/2024).'],
        ['- IC Number should not contain dashes (e.g., 800101145566).'],
        ['- Consideration amount should be numeric (e.g., 100000.00).'],
        ['- Malaysia country code is 146.'],
        ['- Application Type is added automatically by the system.'],
        [''],
        ['REQUIRED FIELDS:'],
        ['- Ref No, Date Signed, Instrument name/description'],
        ['- Transferor: Type, Name, Address, Postcode, City, State, Country, Phone'],
        ['- Transferee: Type, Name, Address, Postcode, City, State, Country, Phone'],
        ['- Individuals need IC (citizen) or Passport + Country (non-citizen)'],
        ['- Companies need ROC Number + Business Type'],
        ['- Sekuriti only: Consideration Amount, Duration Fixed (1=Yes, 2=No)']
    ];
    const instrSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instrSheet['!cols'] = [{ wch: 78 }];
    instrSheet['!rows'] = [{ hpt: 28 }];
    setStyle(instrSheet, 0, 0, STYLE.instrTitle);
    for (let r = 1; r < instructionsData.length; r++) {
        const t = instructionsData[r][0] || '';
        if (t.endsWith(':')) setStyle(instrSheet, r, 0, STYLE.instrHead);
        else if (t) setStyle(instrSheet, r, 0, STYLE.instrBody);
    }
    XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions');

    // Output buffer/array based on platform
    const writeType = (typeof process !== 'undefined' && process.release && process.release.name === 'node') ? 'buffer' : 'array';
    return XLSX.write(wb, { type: writeType, bookType: 'xlsx', cellStyles: true });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateTemplate, TEMPLATE_COLUMNS_SEKURITI, TEMPLATE_COLUMNS_AM };
} else if (typeof window !== 'undefined') {
    window.TemplateGenerator = { generateTemplate, TEMPLATE_COLUMNS_SEKURITI, TEMPLATE_COLUMNS_AM };
}
})();
