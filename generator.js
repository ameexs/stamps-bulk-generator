/**
 * XML Generator Module
 * Generates STAMPS-compliant XML with smart batching
 */

// Maximum batch size in bytes (29MB for safety buffer)
const MAX_BATCH_SIZE = 29 * 1024 * 1024;

// XML header and footer
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n<bulkstamping>\n    <applicationType>43</applicationType>';
const XML_FOOTER = '\n</bulkstamping>';

/**
 * Generate XML files from mapped data
 * @param {Array} mappedData - Array of mapped record objects
 * @param {Map} attachmentFiles - Map of filename -> attachment data
 * @param {Function} getAttachmentBase64 - Function to get attachment base64 data by filename
 * @param {Function} progressCallback - Progress callback function
 * @returns {Array} Array of generated XML objects { filename, content, size, recordCount }
 */
export async function generateXml(mappedData, attachmentFiles, getAttachmentBase64, progressCallback) {
    const batches = [];
    let currentBatch = {
        instruments: [],
        size: XML_HEADER.length + XML_FOOTER.length,
        recordCount: 0
    };

    const totalRecords = mappedData.length;

    for (let i = 0; i < mappedData.length; i++) {
        const record = mappedData[i];

        // Generate instrument XML
        const instrumentXml = generateInstrumentXml(record, getAttachmentBase64);
        const instrumentSize = new Blob([instrumentXml]).size;

        // Check if adding this instrument would exceed batch size
        if (currentBatch.size + instrumentSize > MAX_BATCH_SIZE && currentBatch.instruments.length > 0) {
            // Finalize current batch
            batches.push(finalizeBatch(currentBatch, batches.length + 1));

            // Start new batch
            currentBatch = {
                instruments: [],
                size: XML_HEADER.length + XML_FOOTER.length,
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
        batches.push(finalizeBatch(currentBatch, batches.length + 1));
    }

    return batches;
}

/**
 * Finalize a batch into XML content
 * @param {Object} batch - Batch object
 * @param {number} batchNumber - Batch number
 * @returns {Object} Finalized batch
 */
function finalizeBatch(batch, batchNumber) {
    const content = XML_HEADER + batch.instruments.join('') + XML_FOOTER;

    return {
        filename: batchNumber === 1 ? 'Output.xml' : `Output_Batch_${batchNumber}.xml`,
        content,
        size: new Blob([content]).size,
        recordCount: batch.recordCount
    };
}

/**
 * Generate XML for a single instrument
 * @param {Object} record - Mapped record data
 * @param {Function} getAttachmentBase64 - Function to get attachment base64 by filename
 * @returns {string} Instrument XML string
 */
function generateInstrumentXml(record, getAttachmentBase64) {
    let attachmentBase64 = '';
    let attachmentName = record.attachment || '';

    if (attachmentName) {
        try {
            attachmentBase64 = getAttachmentBase64(attachmentName.trim()) || '';
        } catch (e) {
            console.error(`Failed to get attachment: ${attachmentName}`, e);
        }
    }

    const xml = `
    <instrument>
        <refNo>${escapeXml(record.refNo || '')}</refNo>
        <instrumentDate>${escapeXml(record.instrumentDate || '')}</instrumentDate>
        <instrumentDateReceive>${escapeXml(record.instrumentDateReceive || '')}</instrumentDateReceive>
        <principal>${escapeXml(record.principal || '')}</principal>
        <subsidiary>${escapeXml(record.subsidiary || '')}</subsidiary>
        <typeOfInstrument>${escapeXml(record.typeOfInstrument || '')}</typeOfInstrument>
        <typeOfInstrumentOthers>${escapeXml(record.typeOfInstrumentOthers || '')}</typeOfInstrumentOthers>
        <transferor>
            <type>${escapeXml(record.transferor?.type || '')}</type>
            <name>${escapeXml(record.transferor?.name || '')}</name>
            <nationality>${escapeXml(record.transferor?.nationality || '')}</nationality>
            <icNo>${escapeXml(record.transferor?.icNo || '')}</icNo>
            <pasportNo>${escapeXml(record.transferor?.pasportNo || '')}</pasportNo>
            <pasportCountry>${escapeXml(record.transferor?.pasportCountry || '')}</pasportCountry>
            <rocNo>${escapeXml(record.transferor?.rocNo || '')}</rocNo>
            <busType>${escapeXml(record.transferor?.busType || '')}</busType>
            <incomeTaxNo>${escapeXml(record.transferor?.incomeTaxNo || '')}</incomeTaxNo>
            <incomeTaxBranch>${escapeXml(record.transferor?.incomeTaxBranch || '')}</incomeTaxBranch>
            <street1>${escapeXml(record.transferor?.street1 || '')}</street1>
            <street2>${escapeXml(record.transferor?.street2 || '')}</street2>
            <street3>${escapeXml(record.transferor?.street3 || '')}</street3>
            <postcode>${escapeXml(record.transferor?.postcode || '')}</postcode>
            <city>${escapeXml(record.transferor?.city || '')}</city>
            <state>${escapeXml(record.transferor?.state || '')}</state>
            <country>${escapeXml(record.transferor?.country || '')}</country>
            <telNo>${escapeXml(record.transferor?.telNo || '')}</telNo>
            <email>${escapeXml(record.transferor?.email || '')}</email>
        </transferor>
        <transferee>
            <type>${escapeXml(record.transferee?.type || '')}</type>
            <name>${escapeXml(record.transferee?.name || '')}</name>
            <nationality>${escapeXml(record.transferee?.nationality || '')}</nationality>
            <icNo>${escapeXml(record.transferee?.icNo || '')}</icNo>
            <pasportNo>${escapeXml(record.transferee?.pasportNo || '')}</pasportNo>
            <pasportCountry>${escapeXml(record.transferee?.pasportCountry || '')}</pasportCountry>
            <rocNo>${escapeXml(record.transferee?.rocNo || '')}</rocNo>
            <busType>${escapeXml(record.transferee?.busType || '')}</busType>
            <incomeTaxNo>${escapeXml(record.transferee?.incomeTaxNo || '')}</incomeTaxNo>
            <incomeTaxBranch>${escapeXml(record.transferee?.incomeTaxBranch || '')}</incomeTaxBranch>
            <street1>${escapeXml(record.transferee?.street1 || '')}</street1>
            <street2>${escapeXml(record.transferee?.street2 || '')}</street2>
            <street3>${escapeXml(record.transferee?.street3 || '')}</street3>
            <postcode>${escapeXml(record.transferee?.postcode || '')}</postcode>
            <city>${escapeXml(record.transferee?.city || '')}</city>
            <state>${escapeXml(record.transferee?.state || '')}</state>
            <country>${escapeXml(record.transferee?.country || '')}</country>
            <telNo>${escapeXml(record.transferee?.telNo || '')}</telNo>
            <email>${escapeXml(record.transferee?.email || '')}</email>
        </transferee>
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

    return xml;
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
    let totalSize = XML_HEADER.length + XML_FOOTER.length;

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
