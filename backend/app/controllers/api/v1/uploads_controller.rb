# POST /api/v1/uploads: stores one file of any type for embedding in a document
# (an image, video or audio player, or a downloadable attachment card).
#
# Any content type is accepted. Active Storage serves the types a browser could
# run (HTML, SVG, scripts, XML) as a download, never inline, so an uploaded page
# cannot execute on the app's origin; the clients embed only what a browser can
# play or show and offer everything else as a download. There is no virus
# scanning, and no quota beyond the per-file cap.
class Api::V1::UploadsController < ApplicationController
  include WorkspaceScoped

  MAX_SIZE = 100.megabytes
  DEFAULT_CONTENT_TYPE = "application/octet-stream".freeze

  def create
    file = params[:file]
    return render json: { error: "No file provided" }, status: :unprocessable_entity unless file.respond_to?(:original_filename)
    return render json: { error: "File too large (the limit is #{MAX_SIZE / 1.megabyte} MB)" }, status: :unprocessable_entity if file.size > MAX_SIZE

    blob = ActiveStorage::Blob.create_and_upload!(
      io: file.tempfile,
      filename: file.original_filename,
      content_type: file.content_type.presence || DEFAULT_CONTENT_TYPE,
    )

    render json: {
      url: rails_blob_url(blob, host: request.base_url),
      filename: blob.filename.to_s,
      content_type: blob.content_type,
      byte_size: blob.byte_size,
    }
  end
end
