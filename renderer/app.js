/**
 * STAMPS Bulk Generator - Main Application
 * Simplified single-page workflow
 */

import { parseFile, getPreviewHeaders, getPreviewRow } from './parser.js';
import { validateAll } from './validator.js';
import { generateXml, formatFileSize } from './generator.js';

// Application State
const state = {
    currentStep: 1,
    excelFile: null,
    excelData: null,
    parsedData: null,
    mappedData: null,
    validationResults: null,
    generatedFiles: [],
    requiredAttachments: [],
    attachmentFiles: new Map(),
    matchedCount: 0,
    missingCount: 0
};

// DOM Elements
const elements = {};

/**
 * Initialize application
 */
async function init() {
    cacheElements();
    bindEvents();
    console.log('STAMPS Bulk Generator initialized');
}

/**
 * Cache DOM elements
 */
function cacheElements() {
    // Steps
    elements.steps = document.querySelectorAll('.step');
    elements.stepContents = document.querySelectorAll('.step-content');

    // Step 1 - File Selection
    elements.excelPath = document.getElementById('excel-path');
    elements.selectExcelBtn = document.getElementById('select-excel-btn');
    elements.excelCard = document.getElementById('excel-card');
    elements.attachmentsSection = document.getElementById('attachments-section');
    elements.requiredCount = document.getElementById('required-count');
    elements.selectAttachmentsBtn = document.getElementById('select-attachments-btn');
    elements.requiredFilesList = document.getElementById('required-files-list');
    elements.matchedCount = document.getElementById('matched-count');
    elements.missingCount = document.getElementById('missing-count');
    elements.proceedStep2 = document.getElementById('proceed-step-2');

    // Step 2
    elements.totalRecords = document.getElementById('total-records');
    elements.totalAttachments = document.getElementById('total-attachments');
    elements.estimatedSize = document.getElementById('estimated-size');
    elements.previewHeader = document.getElementById('preview-header');
    elements.previewBody = document.getElementById('preview-body');
    elements.backStep1 = document.getElementById('back-step-1');
    elements.proceedStep3 = document.getElementById('proceed-step-3');

    // Step 3
    elements.validationStatus = document.getElementById('validation-status');
    elements.validationResults = document.getElementById('validation-results');
    elements.validCount = document.getElementById('valid-count');
    elements.errorCount = document.getElementById('error-count');
    elements.warningCount = document.getElementById('warning-count');
    elements.errorsList = document.getElementById('errors-list');
    elements.backStep2 = document.getElementById('back-step-2');
    elements.runValidation = document.getElementById('run-validation');
    elements.proceedStep4 = document.getElementById('proceed-step-4');

    // Step 4
    elements.generationStatus = document.getElementById('generation-status');
    elements.generationProgress = document.getElementById('generation-progress');
    elements.generationComplete = document.getElementById('generation-complete');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.generatedFiles = document.getElementById('generated-files');
    elements.backStep3 = document.getElementById('back-step-3');
    elements.startGeneration = document.getElementById('start-generation');
    elements.startNew = document.getElementById('start-new');

    // File inputs (hidden)
    elements.excelFileInput = document.getElementById('excel-file-input');
    elements.pdfFileInput = document.getElementById('pdf-file-input');
}

/**
 * Bind event listeners
 */
function bindEvents() {
    // Step 1 - File inputs
    elements.selectExcelBtn.addEventListener('click', () => {
        elements.excelFileInput.click();
    });
    elements.excelFileInput.addEventListener('change', handleExcelUpload);

    // Attachment file selection
    if (elements.selectAttachmentsBtn) {
        elements.selectAttachmentsBtn.addEventListener('click', () => {
            elements.pdfFileInput.click();
        });
    }
    if (elements.pdfFileInput) {
        elements.pdfFileInput.addEventListener('change', handleAttachmentUpload);
    }

    elements.proceedStep2.addEventListener('click', () => goToStep(2));

    // Step 2
    elements.backStep1.addEventListener('click', () => goToStep(1));
    elements.proceedStep3.addEventListener('click', () => goToStep(3));

    // Step 3
    elements.backStep2.addEventListener('click', () => goToStep(2));
    elements.runValidation.addEventListener('click', runValidation);
    elements.proceedStep4.addEventListener('click', () => goToStep(4));

    // Step 4
    elements.backStep3.addEventListener('click', () => goToStep(3));
    elements.startGeneration.addEventListener('click', startGeneration);
    if (elements.startNew) {
        elements.startNew.addEventListener('click', resetApp);
    }
}

/**
 * Handle Excel file upload
 */
async function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        console.log('Uploading file:', file.name);
        const res = await fetch('/api/upload/excel', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();

        if (result.error) {
            alert('Error uploading file: ' + result.error);
            return;
        }

        console.log('File uploaded successfully, parsing...');
        state.excelFile = result.filename;
        state.excelData = result.data;

        // Decode base64 and parse
        const binary = atob(result.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        console.log('Calling parseFile...');
        const parsed = await parseFile(bytes.buffer, result.filename);
        console.log('Parsed data:', parsed);

        state.parsedData = parsed.rows;
        state.mappedData = parsed.mappedData;

        elements.excelPath.textContent = result.filename;
        elements.excelCard.classList.add('selected');

        // Extract required attachments from parsed data
        extractRequiredAttachments();

        // Show attachments section
        if (elements.attachmentsSection) {
            elements.attachmentsSection.style.display = 'block';
        }

        // Render the required files list
        renderRequiredFilesList();

        updateProceedButton();
    } catch (error) {
        console.error('Upload/Parse error:', error);
        console.error('Error stack:', error.stack);
        alert('Error uploading file: ' + error.message);
    }
}

/**
 * Extract required attachment filenames from Excel data
 */
function extractRequiredAttachments() {
    state.requiredAttachments = [];
    state.attachmentFiles = new Map();

    if (!state.mappedData) return;

    state.mappedData.forEach(row => {
        if (row.attachment && row.attachment.trim()) {
            const filename = row.attachment.trim();
            if (!state.requiredAttachments.includes(filename)) {
                state.requiredAttachments.push(filename);
            }
        }
    });

    state.matchedCount = 0;
    state.missingCount = state.requiredAttachments.length;

    console.log('Required attachments:', state.requiredAttachments);
}

/**
 * Render the list of required files with match status
 */
function renderRequiredFilesList() {
    if (!elements.requiredFilesList) return;

    // Update count
    if (elements.requiredCount) {
        elements.requiredCount.textContent = `${state.requiredAttachments.length} attachment${state.requiredAttachments.length !== 1 ? 's' : ''} required`;
    }

    if (state.requiredAttachments.length === 0) {
        elements.requiredFilesList.innerHTML = `
            <div class="required-file-item">
                <div class="file-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <span class="file-name">No attachments required in this Excel file</span>
            </div>
        `;
        updateAttachmentStatus();
        return;
    }

    elements.requiredFilesList.innerHTML = state.requiredAttachments.map(filename => {
        const isMatched = state.attachmentFiles.has(filename);
        return `
            <div class="required-file-item ${isMatched ? 'matched' : 'missing'}">
                <div class="file-icon">
                    ${isMatched ? `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    ` : `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                    `}
                </div>
                <span class="file-name">${escapeHtml(filename)}</span>
                <span class="file-status">${isMatched ? '✓ Matched' : 'Missing'}</span>
            </div>
        `;
    }).join('');

    updateAttachmentStatus();
}

/**
 * Update attachment status counts
 */
function updateAttachmentStatus() {
    state.matchedCount = 0;
    state.missingCount = 0;

    state.requiredAttachments.forEach(filename => {
        if (state.attachmentFiles.has(filename)) {
            state.matchedCount++;
        } else {
            state.missingCount++;
        }
    });

    if (elements.matchedCount) {
        elements.matchedCount.textContent = `${state.matchedCount} matched`;
    }
    if (elements.missingCount) {
        elements.missingCount.textContent = `${state.missingCount} missing`;
    }

    updateProceedButton();
}

/**
 * Handle attachment file upload (multi-file)
 */
async function handleAttachmentUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('Processing', files.length, 'attachment files...');

    for (const file of files) {
        const filename = file.name;

        // Read file as base64
        const base64 = await readFileAsBase64(file);

        // Store in attachments map (use filename as key)
        state.attachmentFiles.set(filename, {
            data: base64,
            file: file,
            size: file.size
        });

        console.log('Added attachment:', filename);
    }

    // Re-render the list to show matched status
    renderRequiredFilesList();
}

/**
 * Read file as base64
 */
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix to get just the base64
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Update proceed button state
 */
function updateProceedButton() {
    // Can proceed if we have mapped data AND either no attachments required OR all attachments matched
    const hasData = !!state.mappedData && state.mappedData.length > 0;
    const attachmentsOk = state.requiredAttachments.length === 0 || state.missingCount === 0;
    elements.proceedStep2.disabled = !(hasData && attachmentsOk);
}

/**
 * Go to step
 */
async function goToStep(step) {
    state.currentStep = step;

    // Update step indicators
    elements.steps.forEach((el, i) => {
        el.classList.remove('active', 'completed');
        if (i + 1 < step) el.classList.add('completed');
        if (i + 1 === step) el.classList.add('active');
    });

    // Show step content
    elements.stepContents.forEach((el, i) => {
        el.classList.toggle('active', i + 1 === step);
    });

    // Step-specific actions
    if (step === 2) {
        await renderPreview();
    } else if (step === 3) {
        resetValidation();
    } else if (step === 4) {
        resetGeneration();
    }
}

/**
 * Render preview table
 */
async function renderPreview() {
    const headers = getPreviewHeaders();

    // Render header
    elements.previewHeader.innerHTML = headers.map(h => `<th>${h}</th>`).join('');

    // Render body
    elements.previewBody.innerHTML = state.mappedData.map(row => {
        const preview = getPreviewRow(row);
        return `
            <tr>
                <td>${preview.row}</td>
                <td>${escapeHtml(preview.refNo)}</td>
                <td>${escapeHtml(preview.dateSigned)}</td>
                <td>${escapeHtml(preview.transferorName)}</td>
                <td>${escapeHtml(preview.transfereeName)}</td>
                <td>${escapeHtml(preview.consideration)}</td>
                <td>${escapeHtml(preview.attachment)}</td>
            </tr>
        `;
    }).join('');

    // Update stats
    elements.totalRecords.textContent = state.mappedData.length;

    const attachmentCount = state.mappedData.filter(r => r.attachment).length;
    elements.totalAttachments.textContent = attachmentCount;

    // Estimate size from in-memory attachments
    let totalSize = state.mappedData.length * 5000; // Base estimate for XML
    state.attachmentFiles.forEach((attachment) => {
        totalSize += attachment.size || 0;
    });
    elements.estimatedSize.textContent = formatFileSize(totalSize);
}

/**
 * Reset validation state
 */
function resetValidation() {
    state.validationResults = null;
    elements.validationStatus.style.display = 'block';
    elements.validationResults.style.display = 'none';
    elements.proceedStep4.disabled = true;

    // Reset validation icon
    const icon = elements.validationStatus.querySelector('.validation-icon');
    icon.className = 'validation-icon pending';
    icon.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
    `;

    elements.validationStatus.querySelector('h3').textContent = 'Ready to Validate';
    elements.validationStatus.querySelector('p').textContent = 'Click the button below to validate your data';
    elements.runValidation.disabled = false;
    elements.runValidation.textContent = 'Run Validation';
}

/**
 * Run validation
 */
async function runValidation() {
    elements.runValidation.disabled = true;
    elements.runValidation.textContent = 'Validating...';

    try {
        // Pass attachmentFiles Map to validator
        state.validationResults = await validateAll(
            state.mappedData,
            state.attachmentFiles
        );

        const results = state.validationResults;

        // Update counts
        elements.validCount.textContent = `${results.validCount} valid`;
        elements.errorCount.textContent = `${results.errorCount} errors`;
        elements.warningCount.textContent = `${results.warningCount} warnings`;

        // Update status icon
        const icon = elements.validationStatus.querySelector('.validation-icon');
        if (results.errorCount === 0) {
            icon.className = 'validation-icon success';
            icon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            `;
            elements.validationStatus.querySelector('h3').textContent = 'Validation Passed';
            elements.validationStatus.querySelector('p').textContent = 'All records are valid and ready for generation';
            elements.proceedStep4.disabled = false;
        } else {
            icon.className = 'validation-icon error';
            icon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
            `;
            elements.validationStatus.querySelector('h3').textContent = 'Validation Failed';
            elements.validationStatus.querySelector('p').textContent = 'Please fix the errors below before proceeding';
        }

        // Show results
        elements.validationResults.style.display = 'block';

        // Render errors
        const allIssues = [...results.errors, ...results.warnings];
        elements.errorsList.innerHTML = allIssues.slice(0, 50).map(issue => `
            <div class="error-item ${issue.errorType === 'MISSING_FIELD' || issue.errorType === 'INVALID_DATE' || issue.errorType === 'MISSING_FILE' ? 'error' : 'warning'}">
                <span class="error-row">Row ${issue.rowNumber}</span>
                <span class="error-field">${issue.fieldName}</span>
                <span class="error-message">${issue.message}</span>
            </div>
        `).join('');

        if (allIssues.length > 50) {
            elements.errorsList.innerHTML += `<p class="text-muted">...and ${allIssues.length - 50} more issues</p>`;
        }

    } catch (error) {
        console.error('Validation error:', error);
        alert('Validation failed: ' + error.message);
    } finally {
        elements.runValidation.disabled = false;
        elements.runValidation.textContent = 'Run Validation';
    }
}

/**
 * Reset generation state
 */
function resetGeneration() {
    elements.generationStatus.style.display = 'block';
    elements.generationProgress.style.display = 'none';
    elements.generationComplete.style.display = 'none';
    elements.progressBar.style.width = '0%';
    elements.startGeneration.disabled = false;
}

/**
 * Start XML generation
 */
async function startGeneration() {
    elements.generationStatus.style.display = 'none';
    elements.generationProgress.style.display = 'block';
    elements.startGeneration.disabled = true;

    try {
        // Create a function to get attachment data from in-memory storage
        const getAttachmentBase64 = (filename) => {
            const attachment = state.attachmentFiles.get(filename);
            return attachment ? attachment.data : '';
        };

        // Generate XML with progress
        const batches = await generateXml(
            state.mappedData,
            state.attachmentFiles,
            getAttachmentBase64,
            (progress) => {
                elements.progressBar.style.width = `${progress.percentage}%`;
                elements.progressText.textContent = `Processing record ${progress.current} of ${progress.total}...`;
            }
        );

        state.generatedFiles = batches;

        // Download files via browser
        for (const batch of batches) {
            downloadFile(batch.filename, batch.content, 'application/xml');
        }

        // Show completion
        elements.generationProgress.style.display = 'none';
        elements.generationComplete.style.display = 'block';

        elements.generatedFiles.innerHTML = batches.map(batch => `
            <div class="generated-file">
                <div class="generated-file-name">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    ${batch.filename}
                </div>
                <div class="generated-file-size">${formatFileSize(batch.size)} • ${batch.recordCount} records</div>
            </div>
        `).join('') + `<p style="margin-top: 16px; color: var(--text-secondary);">Files downloaded to your Downloads folder</p>`;

    } catch (error) {
        console.error('Generation error:', error);
        alert('Generation failed: ' + error.message);
        resetGeneration();
    }
}

/**
 * Reset app to start fresh
 */
function resetApp() {
    state.currentStep = 1;
    state.excelFile = null;
    state.excelData = null;
    state.parsedData = null;
    state.mappedData = null;
    state.validationResults = null;
    state.generatedFiles = [];
    state.requiredAttachments = [];
    state.attachmentFiles = new Map();
    state.matchedCount = 0;
    state.missingCount = 0;

    // Reset step indicators
    elements.steps.forEach((el, i) => {
        el.classList.remove('active', 'completed');
        if (i === 0) el.classList.add('active');
    });

    // Reset step contents
    elements.stepContents.forEach((el, i) => {
        el.classList.toggle('active', i === 0);
    });

    // Reset file cards
    elements.excelPath.textContent = 'No file selected';
    elements.excelCard.classList.remove('selected');

    // Hide attachments section
    if (elements.attachmentsSection) {
        elements.attachmentsSection.style.display = 'none';
    }

    // Reset file inputs
    elements.excelFileInput.value = '';
    elements.pdfFileInput.value = '';

    elements.proceedStep2.disabled = true;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Download file via browser
 */
function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
