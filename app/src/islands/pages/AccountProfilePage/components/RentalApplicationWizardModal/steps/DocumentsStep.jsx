/**
 * DocumentsStep.jsx
 *
 * Step 6: Document Uploads
 * File uploads for employment proof, credit score, etc.
 */

import React from 'react';
import { Upload, Check, X, FileText } from 'lucide-react';

function FileUploadBox({
  label,
  hint,
  uploadKey,
  formData,
  urlField,
  uploadedFiles,
  uploadProgress,
  uploadErrors,
  onFileUpload,
  onFileRemove,
}) {
  const hasUrl = formData[urlField];
  const hasFile = uploadedFiles[uploadKey];
  const isUploading = uploadProgress[uploadKey] === 'uploading';
  const isComplete = uploadProgress[uploadKey] === 'complete';
  const error = uploadErrors[uploadKey];

  const handleChange = (e) => {
    if (e.target.files?.length) {
      onFileUpload(uploadKey, e.target.files);
    }
  };

  return (
    <div className="file-upload-box">
      <label className="wizard-label">{label}</label>
      {hint && <p className="wizard-hint">{hint}</p>}

      {hasUrl || hasFile ? (
        <div className="file-upload-box__preview">
          <div className="file-upload-box__file">
            <FileText size={20} />
            <span>{hasFile?.name || 'Uploaded file'}</span>
            {isComplete && <Check size={16} className="file-upload-box__check" />}
          </div>
          <button
            type="button"
            className="file-upload-box__remove"
            onClick={() => onFileRemove(uploadKey)}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className={`file-upload-box__dropzone ${isUploading ? 'file-upload-box__dropzone--uploading' : ''}`}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleChange}
            disabled={isUploading}
          />
          {isUploading ? (
            <div className="file-upload-box__uploading">
              <div className="spinner" />
              <span>Uploading...</span>
            </div>
          ) : (
            <>
              <Upload size={24} />
              <span>Click to upload</span>
              <span className="file-upload-box__formats">JPEG, PNG, WebP, or PDF (max 10MB)</span>
            </>
          )}
        </div>
      )}

      {error && <span className="wizard-error">{error}</span>}
    </div>
  );
}

export default function DocumentsStep({
  formData,
  uploadedFiles,
  uploadProgress,
  uploadErrors,
  onFileUpload,
  onFileRemove,
}) {
  const status = formData.employmentStatus;
  const isEmployee = ['full-time', 'part-time', 'intern'].includes(status);
  const needsAlternate = ['student', 'unemployed', 'other', 'business-owner'].includes(status);

  return (
    <div className="wizard-step documents-step">
      <p className="wizard-step__intro">
        Upload supporting documents. All uploads are optional but help verify your application.
      </p>

      {isEmployee && (
        <FileUploadBox
          label="Proof of Employment"
          hint="Pay stub, employment letter, or offer letter"
          uploadKey="employmentProof"
          urlField="proofOfEmploymentUrl"
          formData={formData}
          uploadedFiles={uploadedFiles}
          uploadProgress={uploadProgress}
          uploadErrors={uploadErrors}
          onFileUpload={onFileUpload}
          onFileRemove={onFileRemove}
        />
      )}

      {needsAlternate && (
        <FileUploadBox
          label="Alternate Financial Guarantee"
          hint="Bank statement, sponsor letter, or other financial proof"
          uploadKey="alternateGuarantee"
          urlField="alternateGuaranteeUrl"
          formData={formData}
          uploadedFiles={uploadedFiles}
          uploadProgress={uploadProgress}
          uploadErrors={uploadErrors}
          onFileUpload={onFileUpload}
          onFileRemove={onFileRemove}
        />
      )}

      <FileUploadBox
        label="Credit Score Screenshot"
        hint="Screenshot from Credit Karma, Experian, or similar"
        uploadKey="creditScore"
        urlField="creditScoreUrl"
        formData={formData}
        uploadedFiles={uploadedFiles}
        uploadProgress={uploadProgress}
        uploadErrors={uploadErrors}
        onFileUpload={onFileUpload}
        onFileRemove={onFileRemove}
      />

      <FileUploadBox
        label="Government ID (Front)"
        hint="Driver's license, state ID, or passport"
        uploadKey="stateIdFront"
        urlField="stateIdFrontUrl"
        formData={formData}
        uploadedFiles={uploadedFiles}
        uploadProgress={uploadProgress}
        uploadErrors={uploadErrors}
        onFileUpload={onFileUpload}
        onFileRemove={onFileRemove}
      />
    </div>
  );
}
