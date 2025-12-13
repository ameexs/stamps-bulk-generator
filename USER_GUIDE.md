# STAMPS Bulk Generator - User Guide

## Privacy & Data Disclaimer

> **🔒 Your Data Stays Private**
> 
> This application processes all data **locally in your browser**. We do NOT:
> - Store your Excel files on any server
> - Save your PDF/image attachments
> - Collect personal information
> - Track your usage or analytics
> - Share any data with third parties
>
> **How it works:**
> - Excel files are temporarily uploaded for parsing, then immediately discarded
> - PDF attachments never leave your browser - they're processed in memory
> - Generated XML files download directly to your computer
> - Refreshing the page clears all data
>
> **You maintain full control of your data at all times.**

---

## Quick Start (5 Minutes)

### Step 1: Download Template
Click **"Download Template"** in the header to get an Excel file with:
- Pre-formatted column headers
- Example data row
- Reference sheets for all codes

### Step 2: Fill Your Data
Open the template in Excel and fill in your instrument data:
- One row per instrument
- Required fields are marked in the Column Reference sheet
- Use the Code Reference sheets for valid codes

### Step 3: Upload & Generate
1. Upload your Excel file
2. Select matching PDF attachments
3. Preview and validate data
4. Generate and download XML files

---

## Detailed Workflow

### Step 1: Select Files

**Upload Excel File:**
- Click "Select File" and choose your filled template
- Supported formats: `.xlsx`, `.xls`, `.csv`
- The app will parse and display required attachments

**Select Attachments:**
- After uploading Excel, you'll see which attachments are needed
- Click "Select PDF Files" to upload matching files
- Green checkmarks show matched files
- All files must match before proceeding

### Step 2: Preview Data

Review your data before processing:
- Total record count
- Attachment count
- Estimated output size
- Data preview table

Click **"Continue to Validate"** when ready.

### Step 3: Validate

Click **"Run Validation"** to check for:
- Missing required fields
- Invalid date formats
- Missing attachment files
- Invalid code values

**Results:**
- ✅ Green = Validation passed, proceed to generate
- ❌ Red = Errors found, fix in Excel and re-upload

### Step 4: Generate XML

Click **"Generate XML"** to create STAMPS-compliant files:
- Progress bar shows generation status
- Files automatically download to your Downloads folder
- Large batches are split into multiple files (50 records each)

---

## Excel Template Reference

### Required Fields
| Field | Description |
|-------|-------------|
| Ref No | Unique reference number |
| Date Signed | DD/MM/YYYY format |
| Date Received | DD/MM/YYYY format |
| Principal/Sub | -1 or 0 |
| Instrument Type | Type code number |
| Transferor Type | 0 (Individual) or 1 (Company) |
| Transferor Name | Full name |
| Transferor IC | 12 digits, no dashes |
| Transferee Type | 0 (Individual) or 1 (Company) |
| Transferee Name | Full name |
| Transferee IC | 12 digits, no dashes |
| Consideration | Amount in RM |
| No of Copies | Number |

### Code Reference

**State Codes (LAMPIRAN E):**
| Code | State |
|------|-------|
| 1 | Johor |
| 2 | Kedah |
| ... | (See template) |
| 14 | WP Kuala Lumpur |

**Country Code:**
- Malaysia = **146**

**Party Type:**
- 0 = Individual
- 1 = Company

**Nationality:**
- 1 = Citizen
- 2 = Non-Citizen
- 3 = Permanent Resident

---

## Troubleshooting

### "Validation Failed" Error
- Check required fields are filled
- Verify date format is DD/MM/YYYY
- Ensure IC numbers have 12 digits (no dashes)
- Check attachment filenames match exactly

### Missing Attachments
- Filename in Excel must match exactly (case-sensitive)
- Supported: PDF, JPG, JPEG, PNG
- Upload all required files before proceeding

### Large Files Taking Long
- Files over 5MB may take longer to process
- Consider splitting into smaller batches
- Browser handles all processing - be patient

---

## Support

For issues or feature requests, contact the application administrator.

**Version:** 1.0.0  
**Last Updated:** December 2024
