import api from '@/lib/api'
import type { UploadedFile } from '@/data/attachment'

// Stores one file of any type (up to 100 MB) for embedding in a document.
// A failed call shows its error through lib/api.ts and rejects.
export function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file)
  return api.post<UploadedFile>('/api/v1/uploads', form).then((r) => r.data)
}
