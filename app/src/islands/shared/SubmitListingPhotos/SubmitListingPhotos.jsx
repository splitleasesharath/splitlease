import React, { useState, useRef } from 'react'
import DeletePhotoModal from './DeletePhotoModal'
import './SubmitListingPhotos.css'

const SubmitListingPhotos = ({ listingId, onClose, onSuccess }) => {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    addFiles(files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    addFiles(imageFiles)
  }

  const addFiles = (files) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/gif', 'image/png']
    const validFiles = files.filter(file => validTypes.includes(file.type))

    if (uploadedFiles.length + validFiles.length > 20) {
      alert('Maximum 20 files allowed')
      return
    }

    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedFiles(prev => [...prev, {
          file: file,
          preview: e.target.result,
          name: file.name
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) return

    setIsUploading(true)

    try {
      const BUBBLE_API_KEY = import.meta.env.VITE_BUBBLE_API_KEY
      const UPLOAD_ENDPOINT = 'https://app.split.lease/api/1.1/wf/listing_photos_section_in_code'

      if (!BUBBLE_API_KEY) {
        throw new Error('API key not configured')
      }

      const formData = new FormData()
      formData.append('Listing_id', listingId)

      uploadedFiles.forEach((fileData) => {
        formData.append('Photos', fileData.file)
      })

      console.log('Uploading', uploadedFiles.length, 'files to Bubble...')

      const response = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BUBBLE_API_KEY}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed')
      }

      console.log('Upload successful:', data)
      alert(`${uploadedFiles.length} file(s) uploaded successfully!`)

      // Reset state
      setUploadedFiles([])
      setPreviews([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      if (onSuccess) onSuccess()
      if (onClose) onClose()
    } catch (error) {
      console.error('Upload failed:', error)
      alert(`Failed to upload images: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteClick = (index) => {
    setPhotoToDelete({ index, ...uploadedFiles[index] })
  }

  const confirmDelete = () => {
    if (photoToDelete !== null) {
      const newFiles = uploadedFiles.filter((_, index) => index !== photoToDelete.index)
      setUploadedFiles(newFiles)
      setPhotoToDelete(null)
    }
  }

  const cancelDelete = () => {
    setPhotoToDelete(null)
  }

  const handleSelectFilesClick = (e) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  return (
    <>
      <div className="modal-overlay">
        <div className="listing-photos-submit">
          {/* Close Button */}
          <button className="close-btn" onClick={onClose}>
            ×
          </button>

          {/* Upload Section */}
          <div className="upload-section">
            <div className="upload-header">
              <h3 className="upload-title">Upload</h3>
            </div>
            <p className="upload-instruction">
              Extract compressed files before accessing the pictures.
            </p>

            {/* File Upload Area */}
            <div
              className={`file-upload-area ${isDragActive ? 'drag-over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="upload-content">
                <div className="upload-icon">
                  <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
                    <rect x="8" y="12" width="34" height="26" rx="2" stroke="#2B3674" strokeWidth="2"/>
                    <circle cx="18" cy="22" r="3" fill="#2B3674"/>
                    <path d="M8 32 L18 24 L26 30 L34 22 L42 28 L42 38 L8 38 Z" fill="#2B3674" opacity="0.3"/>
                  </svg>
                </div>
                <p className="upload-main-text">Drag and drop image files to upload</p>
                <button
                  className="select-files-btn"
                  onClick={handleSelectFilesClick}
                >
                  Select files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpeg,.jpg,.gif,.png"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <p className="upload-formats">Accepted formats: jpeg, jpg, gif, png</p>
                <p className="upload-multiple">You can submit multiple files at once</p>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          {uploadedFiles.length > 0 && (
            <div className="preview-section">
              <h4 className="preview-title">Preview</h4>
              <div className="preview-grid">
                {uploadedFiles.map((fileData, index) => (
                  <div key={index} className="preview-item">
                    <img src={fileData.preview} alt={fileData.name} />
                    <button
                      className="preview-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(index)
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="upload-button-container">
            <button
              className="upload-images-btn"
              onClick={handleUpload}
              disabled={isUploading || uploadedFiles.length === 0}
            >
              {isUploading ? 'Uploading...' : 'Upload Images'}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {photoToDelete && (
        <DeletePhotoModal
          photoName={photoToDelete.name}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </>
  )
}

export default SubmitListingPhotos
