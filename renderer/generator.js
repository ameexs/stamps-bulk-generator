/**
 * XML Generator Module
 * Generates STAMPS-compliant XML with smart batching.
 * Supports two application types:
 *   - 'sekuriti' -> applicationType 43 (Penyeteman Sekuriti)
 *   - 'am'       -> applicationType 44 (Penyeteman Am)
 */

// Maximum batch size in bytes (29MB for safety buffer)
const MAX_BATCH_SIZE = 29 * 1024 * 1024;

// Application type codes per LHDN spec
const APPLICATION_TYPE = { sekuriti: '43', am: '44' };

const XML_FOOTER = '\n</bulkstamping>';

/**
 * Attachment filename rules (LHDN spec 2.3.5 + observed portal behaviour).
 *
 * The spec allows .pdf/.jpeg/.png/.gif only, and the portal's validator parses
 * the file type from the FILENAME — names with extra dots (e.g. dates like
 * "signed 10.6.2026.pdf"), spaces or parentheses get rejected as
 * "file type not compliant" even when the embedded content is a valid PDF.
 * Note: the spec lists .jpeg, not .jpg — we map jpg -> jpeg.
 */
const ALLOWED_ATTACHMENT_EXTENSIONS = ['pdf', 'jpeg', 'png', 'gif'];
const EXTENSION_ALIASES = { jpg: 'jpeg' };

/**
 * Split a filename into base + normalised extension (after alias mapping).
 * @returns {{base: string, ext: string|null}} ext is lowercase or null if none
 */
function splitAttachmentName(filename) {
    const trimmed = String(filename || '').trim();
    const dot = trimmed.lastIndexOf('.');
    if (dot <= 0 || dot === trimmed.length - 1) return { base: trimmed, ext: null };
    const rawExt = trimmed.slice(dot + 1).toLowerCase();
    return { base: trimmed.slice(0, dot), ext: EXTENSION_ALIASES[rawExt] || rawExt };
}

/**
 * Whether the filename's extension is one LHDN accepts (jpg counts, mapped to jpeg).
 */
export function isAllowedAttachmentExtension(filename) {
    const { ext } = splitAttachmentName(filename);
    return ext !== null && ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext);
}

/**
 * Produce an LHDN-safe attachment name: single dot, lowercase allowed
 * extension, and only [A-Za-z0-9_-] in the base (spaces/dots/parentheses
 * become underscores). The original file on disk is untouched — this only
 * affects the name="" attribute written into the XML, which is safe because
 * the file content itself is embedded as base64.
 */
export function sanitizeAttachmentName(filename) {
    const { base, ext } = splitAttachmentName(filename);
    let cleanBase = base
        .replace(/[^A-Za-z0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
    if (!cleanBase) cleanBase = 'attachment';
    return ext ? `${cleanBase}.${ext}` : cleanBase;
}

/**
 * Build the XML header for a given mode.
 * @param {string} mode - 'sekuriti' | 'am'
 * @returns {string}
 */
function buildXmlHeader(mode) {
    const appType = APPLICATION_TYPE[mode] || APPLICATION_TYPE.sekuriti;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<bulkstamping>\n    <applicationType>${appType}</applicationType>`;
}

/**
 * Generate XML files from mapped data
 * @param {Array} mappedData - Array of mapped record objects
 * @param {Map} attachmentFiles - Map of filename -> attachment data
 * @param {Function} getAttachmentBase64 - Function to get attachment base64 data by filename
 * @param {Function} progressCallback - Progress callback function
 * @param {string} mode - 'sekuriti' (43) | 'am' (44). Defaults to 'sekuriti'.
 * @returns {Array} Array of generated XML objects { filename, content, size, recordCount }
 */
export async function generateXml(mappedData, attachmentFiles, getAttachmentBase64, progressCallback, mode = 'sekuriti') {
    const header = buildXmlHeader(mode);
    const batches = [];
    let currentBatch = {
        instruments: [],
        size: header.length + XML_FOOTER.length,
        recordCount: 0
    };

    const totalRecords = mappedData.length;

    for (let i = 0; i < mappedData.length; i++) {
        const record = mappedData[i];

        // Generate instrument XML
        const instrumentXml = generateInstrumentXml(record, getAttachmentBase64, mode);
        const instrumentSize = new Blob([instrumentXml]).size;

        // Check if adding this instrument would exceed batch size
        if (currentBatch.size + instrumentSize > MAX_BATCH_SIZE && currentBatch.instruments.length > 0) {
            // Finalize current batch
            batches.push(finalizeBatch(currentBatch, batches.length + 1, header));

            // Start new batch
            currentBatch = {
                instruments: [],
                size: header.length + XML_FOOTER.length,
                recordCount: 0
            };
        }

        // Add instrument to current batch
        currentBatch.instruments.push(instrumentXml);
        currentBatch.size += instrumentSize;
        currentBatch.recordCount++;

        // Report progress
        if (progressCallback) {
            progressCallback({
                current: i + 1,
                total: totalRecords,
                percentage: Math.round(((i + 1) / totalRecords) * 100),
                currentBatch: batches.length + 1
            });
        }
    }

    // Finalize last batch
    if (currentBatch.instruments.length > 0) {
        batches.push(finalizeBatch(currentBatch, batches.length + 1, header));
    }

    return batches;
}

/**
 * Finalize a batch into XML content
 * @param {Object} batch - Batch object
 * @param {number} batchNumber - Batch number
 * @param {string} header - XML header for the active mode
 * @returns {Object} Finalized batch
 */
function finalizeBatch(batch, batchNumber, header) {
    const content = header + batch.instruments.join('') + XML_FOOTER;

    return {
        filename: batchNumber === 1 ? 'Output.xml' : `Output_Batch_${batchNumber}.xml`,
        content,
        size: new Blob([content]).size,
        recordCount: batch.recordCount
    };
}

/**
 * Generate XML for a single instrument, dispatching by mode.
 * @param {Object} record - Mapped record data
 * @param {Function} getAttachmentBase64 - Function to get attachment base64 by filename
 * @param {string} mode - 'sekuriti' | 'am'
 * @returns {string} Instrument XML string
 */
function generateInstrumentXml(record, getAttachmentBase64, mode) {
    let attachmentBase64 = '';
    const attachmentName = record.attachment || '';

    if (attachmentName) {
        try {
            // Lookup uses the ORIGINAL name (that's the key in the uploads map)
            attachmentBase64 = getAttachmentBase64(attachmentName.trim()) || '';
        } catch (e) {
            console.error(`Failed to get attachment: ${attachmentName}`, e);
        }
    }

    // The XML gets the sanitized name — LHDN's validator rejects names with
    // extra dots/spaces as "file type not compliant".
    const safeName = attachmentName ? sanitizeAttachmentName(attachmentName) : '';

    if (mode === 'am') {
        return amInstrumentXml(record, safeName, attachmentBase64);
    }
    return sekuritiInstrumentXml(record, safeName, attachmentBase64);
}

/**
 * Shared transferor/transferee block (identical structure in both modes).
 * @param {string} tag - 'transferor' | 'transferee'
 * @param {Object} p - party data
 * @returns {string}
 */
function partyBlock(tag, p) {
    p = p || {};
    return `        <${tag}>
            <type>${escapeXml(p.type || '')}</type>
            <name>${escapeXml(p.name || '')}</name>
            <nationality>${escapeXml(p.nationality || '')}</nationality>
            <icNo>${escapeXml(p.icNo || '')}</icNo>
            <pasportNo>${escapeXml(p.pasportNo || '')}</pasportNo>
            <pasportCountry>${escapeXml(p.pasportCountry || '')}</pasportCountry>
            <rocNo>${escapeXml(p.rocNo || '')}</rocNo>
            <busType>${escapeXml(p.busType || '')}</busType>
            <incomeTaxNo>${escapeXml(p.incomeTaxNo || '')}</incomeTaxNo>
            <incomeTaxBranch>${escapeXml(p.incomeTaxBranch || '')}</incomeTaxBranch>
            <street1>${escapeXml(p.street1 || '')}</street1>
            <street2>${escapeXml(p.street2 || '')}</street2>
            <street3>${escapeXml(p.street3 || '')}</street3>
            <postcode>${escapeXml(p.postcode || '')}</postcode>
            <city>${escapeXml(p.city || '')}</city>
            <state>${escapeXml(p.state || '')}</state>
            <country>${escapeXml(p.country || '')}</country>
            <telNo>${escapeXml(p.telNo || '')}</telNo>
            <email>${escapeXml(p.email || '')}</email>
        </${tag}>`;
}

/**
 * Penyeteman Sekuriti (applicationType 43) instrument body.
 */
function sekuritiInstrumentXml(record, attachmentName, attachmentBase64) {
    return `
    <instrument>
        <refNo>${escapeXml(record.refNo || '')}</refNo>
        <instrumentDate>${escapeXml(record.instrumentDate || '')}</instrumentDate>
        <instrumentDateReceive>${escapeXml(record.instrumentDateReceive || '')}</instrumentDateReceive>
        <principal>${escapeXml(record.principal || '')}</principal>
        <subsidiary>${escapeXml(record.subsidiary || '')}</subsidiary>
        <typeOfInstrument>${escapeXml(record.typeOfInstrument || '')}</typeOfInstrument>
        <typeOfInstrumentOthers>${escapeXml(record.typeOfInstrumentOthers || '')}</typeOfInstrumentOthers>
${partyBlock('transferor', record.transferor)}
${partyBlock('transferee', record.transferee)}
        <consideration>${escapeXml(record.consideration || '')}</consideration>
        <duration>${escapeXml(record.duration || '')}</duration>
        <durationDesc>${escapeXml(record.durationDesc || '')}</durationDesc>
        <colLand>${escapeXml(record.colLand || '')}</colLand>
        <colLandDesc>${escapeXml(record.colLandDesc || '')}</colLandDesc>
        <colShare>${escapeXml(record.colShare || '')}</colShare>
        <colDeposit>${escapeXml(record.colDeposit || '')}</colDeposit>
        <colOthers>${escapeXml(record.colOthers || '')}</colOthers>
        <colOthersDesc>${escapeXml(record.colOthersDesc || '')}</colOthersDesc>
        <noOfCopy>${escapeXml(record.noOfCopy || '')}</noOfCopy>
        <exemption>${escapeXml(record.exemption || '')}</exemption>
        <exemptionOthers>${escapeXml(record.exemptionOthers || '')}</exemptionOthers>
        <remession>${escapeXml(record.remession || '')}</remession>
        <remessionOthers>${escapeXml(record.remessionOthers || '')}</remessionOthers>
        <attachment name="${escapeXml(attachmentName)}">${attachmentBase64}</attachment>
    </instrument>`;
}

/**
 * Penyeteman Am (applicationType 44) instrument body (per LHDN spec 2.2).
 * Am-only fields: remessionOrExemption (Pengecualian/Peremitan),
 * payment (Bayaran/Balasan RM), aggrementInfo (Maklumat Perjanjian).
 */
function amInstrumentXml(record, attachmentName, attachmentBase64) {
    return `
    <instrument>
        <refNo>${escapeXml(record.refNo || '')}</refNo>
        <instrumentDate>${escapeXml(record.instrumentDate || '')}</instrumentDate>
        <instrumentDateReceive>${escapeXml(record.instrumentDateReceive || '')}</instrumentDateReceive>
        <typeOfInstrument>${escapeXml(record.typeOfInstrument || '')}</typeOfInstrument>
        <typeOfInstrumentOthers>${escapeXml(record.typeOfInstrumentOthers || '')}</typeOfInstrumentOthers>
${partyBlock('transferor', record.transferor)}
${partyBlock('transferee', record.transferee)}
        <noOfCopy>${escapeXml(record.noOfCopy || '')}</noOfCopy>
        <remessionOrExemption>${escapeXml(record.remessionOrExemption || '')}</remessionOrExemption>
        <payment>${escapeXml(record.payment || '')}</payment>
        <aggrementInfo>${escapeXml(record.aggrementInfo || '')}</aggrementInfo>
        <attachment name="${escapeXml(attachmentName)}">${attachmentBase64}</attachment>
    </instrument>`;
}

/**
 * Escape special XML characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
    if (str === null || str === undefined) return '';

    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Estimate total size based on records and attachments
 * @param {Array} mappedData - Mapped data array
 * @param {string} attachmentsPath - Path to attachments
 * @param {Function} getFileSize - Function to get file size
 * @returns {number} Estimated size in bytes
 */
export async function estimateTotalSize(mappedData, attachmentsPath, getFileSize) {
    let totalSize = buildXmlHeader('sekuriti').length + XML_FOOTER.length;

    // Base XML size per record (rough estimate without attachments)
    const baseRecordSize = 3000; // ~3KB per record XML
    totalSize += mappedData.length * baseRecordSize;

    // Add attachment sizes
    for (const record of mappedData) {
        if (record.attachment) {
            const attachmentPath = `${attachmentsPath}\\${record.attachment}`;
            try {
                const size = await getFileSize(attachmentPath);
                // Base64 encoding increases size by ~33%
                totalSize += Math.ceil(size * 1.37);
            } catch (e) {
                // File not found, skip
            }
        }
    }

    return totalSize;
}
