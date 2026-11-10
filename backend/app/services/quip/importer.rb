module Quip
  # Orchestrates one QuipImport run: walks the account's Desktop/Starred/
  # Shared folder roots (mirroring quip-export's MigrationEngine.swift),
  # creating a matching Folder/Document under quip_import.destination_folder
  # (or at the workspace root when none was chosen) for every thread found.
  #
  # Runs inside QuipImportJob, not a request — the token lives only in the
  # Client instance's memory for the run's duration, never persisted.
  # Takes an already-constructed `client:` (real Quip::Client in
  # production, a hand-rolled test double in specs) rather than a bare
  # token, so tests never need to stub Client.new or hit the network.
  class Importer
    def initialize(quip_import:, client:)
      @quip_import = quip_import
      @workspace = quip_import.workspace
      @client = client
      @visited_folders = Set.new
      @visited_threads = Set.new
    end

    def run!
      @quip_import.update!(status: :running, started_at: Time.current)

      user = @client.current_user
      root_ids = ([ user["desktop_folder_id"], user["starred_folder_id"] ].compact +
                  (user["shared_folder_ids"] || [])).uniq

      root_ids.each { |quip_folder_id| walk_folder(quip_folder_id, parent_folder: @quip_import.destination_folder) }

      @quip_import.update!(status: :completed, finished_at: Time.current)
    rescue Quip::NotAuthorizedError, Quip::ApiError => e
      @quip_import.update!(status: :failed, error_message: e.message, finished_at: Time.current)
    end

    private

    def walk_folder(quip_folder_id, parent_folder:)
      return if @visited_folders.include?(quip_folder_id)

      @visited_folders << quip_folder_id
      data = @client.folder(quip_folder_id)

      folder = @workspace.folders.create!(name: data.dig("folder", "title").presence || "Untitled", parent: parent_folder)
      @quip_import.increment!(:folders_created)

      (data["children"] || []).each do |child|
        if child["thread_id"]
          import_thread(child["thread_id"], folder: folder)
        elsif child["folder_id"]
          walk_folder(child["folder_id"], parent_folder: folder)
        end
      end
    end

    def import_thread(thread_id, folder:)
      return if @visited_threads.include?(thread_id)

      @visited_threads << thread_id
      data = @client.thread(thread_id)
      title = data.dig("thread", "title").presence || "Untitled"

      # Quip spreadsheets are a completely different content shape
      # (fortune-sheet's own JSON, not Tiptap) — converting their HTML
      # tables into that is a distinct, large sub-feature of its own.
      # Imported as a plain document for now rather than dropped, so
      # nothing from the account goes missing silently.
      converter = HtmlConverter.new(image_uploader: ->(src) { upload_blob(thread_id: thread_id, src: src) })
      content = converter.to_tiptap_json(data["html"] || "", title: title)

      folder.documents.create!(title: title, doc_type: :document, content: content, created_by: @workspace.user)
      @quip_import.increment!(:documents_imported)
    rescue => e
      Rails.logger.error("Quip import #{@quip_import.id}: failed to import thread #{thread_id}: #{e.message}")
      @quip_import.increment!(:documents_failed)
    end

    # Quip blob image src attributes look like "/blob/<thread_or_secret>/<hash>".
    # Anything else (an external image URL already, e.g.) is left as-is.
    BLOB_SRC = %r{/blob/[^/]+/([^/?#]+)}

    def upload_blob(thread_id:, src:)
      match = src.to_s.match(BLOB_SRC)
      return src unless match

      data = @client.blob(thread_id: thread_id, blob_hash: match[1])
      blob = ActiveStorage::Blob.create_and_upload!(io: StringIO.new(data), filename: match[1], content_type: "image/png")
      Rails.application.routes.url_helpers.rails_blob_url(blob, host: AppSettings.app_url)
    rescue => e
      Rails.logger.error("Quip import #{@quip_import.id}: failed to fetch image #{src}: #{e.message}")
      nil
    end
  end
end
