import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '@/api/base'
import DocTypeIcon from '@/components/DocTypeIcon'
import { Button, classNames } from '@/components/ui'
import { filePreview, formatBytes, galleryFiles, GALLERY_FILTERS, type GalleryFilter } from '@/data/document'
import type { Document } from '@/types'
import './FilesGallery.scss'

// A grid of the Space's uploaded files: image thumbnails, an icon for the rest,
// filterable by kind. Opening a card opens the file viewer.
export default function FilesGallery({ documents }: { documents: Document[] }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<GalleryFilter>('all')
  const files = galleryFiles(documents, filter)

  return (
    <div className="files_gallery">
      <div className="files_gallery-filters" role="group" aria-label="Show">
        {GALLERY_FILTERS.map(({ value, label }) => (
          <Button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={classNames('files_gallery-filter', filter === value && 'files_gallery-filter--active')}>{label}</Button>
        ))}
      </div>
      {files.length === 0 && <p className="files_gallery-empty">No files here yet. Upload some from the buttons above.</p>}
      <div className="files_gallery-grid">
        {files.map((doc) => (
          <Button key={doc.id} variant="unstyled" className="files_gallery-card" onClick={() => navigate(`/documents/${doc.id}`)} aria-label={`Open ${doc.title}`}>
            <span className="files_gallery-thumb">
              {filePreview(doc.file?.content_type) === 'image' && doc.file
                ? <img src={apiUrl(doc.file.url)} alt="" loading="lazy" />
                : <DocTypeIcon type="file" className="files_gallery-icon" />}
            </span>
            <span className="files_gallery-name">{doc.title}</span>
            {doc.file && <span className="files_gallery-size">{formatBytes(doc.file.byte_size)}</span>}
          </Button>
        ))}
      </div>
    </div>
  )
}
